/* ResearchAtlas hardening: workspace membership, secure workflow RPCs, audit helpers. */

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ws_id AND wm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = ws_id AND w.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_member(proj_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = proj_id AND is_workspace_member(p.workspace_id)
  ) AND (
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = proj_id AND pm.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles pr
      JOIN projects p2 ON p2.workspace_id = pr.workspace_id
      WHERE p2.id = proj_id AND pr.id = auth.uid() AND pr.role = 'admin'
    )
  );
$$;

CREATE OR REPLACE FUNCTION is_project_supervisor(proj_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = proj_id AND pm.user_id = auth.uid()
      AND pm.role IN ('supervisor','reviewer')
  ) OR EXISTS (
    SELECT 1 FROM projects p JOIN profiles pr ON pr.workspace_id = p.workspace_id
    WHERE p.id = proj_id AND pr.id = auth.uid() AND pr.role = 'admin'
  );
$$;

DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
CREATE POLICY workspace_members_select ON workspace_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_members_insert ON workspace_members;
CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.workspace_id = workspace_id AND p.role = 'admin')
  )
);
DROP POLICY IF EXISTS workspace_members_update ON workspace_members;
CREATE POLICY workspace_members_update ON workspace_members FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.workspace_id = workspace_id AND p.role = 'admin'))
WITH CHECK (true);
DROP POLICY IF EXISTS workspace_members_delete ON workspace_members;
CREATE POLICY workspace_members_delete ON workspace_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.workspace_id = workspace_id AND p.role = 'admin'));

/* Keep the authoritative workspace boundary on every research table. */
DROP POLICY IF EXISTS insert_projects ON projects;
CREATE POLICY insert_projects ON projects FOR INSERT TO authenticated
WITH CHECK (
  is_workspace_member(workspace_id)
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.workspace_id = workspace_id)
);

/* Atomic project creation also creates the project membership, fixing the orphan-project edge case. */
CREATE OR REPLACE FUNCTION create_project(
  p_workspace_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_template_id text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result projects;
BEGIN
  IF NOT is_workspace_member(p_workspace_id) THEN RAISE EXCEPTION 'Not a member of this workspace'; END IF;
  INSERT INTO projects(workspace_id,title,description,template_id,start_date,due_date)
  VALUES(p_workspace_id, trim(p_title), p_description, p_template_id, p_start_date, p_due_date)
  RETURNING * INTO result;
  INSERT INTO project_members(project_id,user_id,role) VALUES(result.id, auth.uid(), 'researcher');
  INSERT INTO audit_events(actor_id,workspace_id,project_id,action,new_state,metadata)
  VALUES(auth.uid(),result.workspace_id,result.id,'project_created','active',jsonb_build_object('template_id',p_template_id));
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION create_project(uuid,text,text,text,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION personal_complete_stage(p_project_id uuid)
RETURNS projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p projects; idx int; next_stage text; old_status text;
BEGIN
  SELECT * INTO p FROM projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT is_project_member(p_project_id) THEN RAISE EXCEPTION 'Project not accessible'; END IF;
  IF NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=p.workspace_id AND w.type='personal') THEN RAISE EXCEPTION 'Self-directed completion is only available in personal workspaces'; END IF;
  old_status := p.current_stage_status;
  idx := array_position(ARRAY['research_question','literature_review','data_collection','data_qc','methodology','analysis','results','manuscript'], p.current_stage);
  IF idx < 8 THEN next_stage := (ARRAY['research_question','literature_review','data_collection','data_qc','methodology','analysis','results','manuscript'])[idx+1];
    UPDATE projects SET current_stage=next_stage,current_stage_status='not_started' WHERE id=p.id RETURNING * INTO p;
  ELSE
    UPDATE projects SET current_stage_status='approved',status='completed' WHERE id=p.id RETURNING * INTO p;
  END IF;
  INSERT INTO audit_events(actor_id,workspace_id,project_id,action,stage,previous_state,new_state)
  VALUES(auth.uid(),p.workspace_id,p.id,'personal_stage_completed',p.current_stage,old_status,p.current_stage_status);
  RETURN p;
END; $$;
GRANT EXECUTE ON FUNCTION personal_complete_stage(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION submit_stage_for_review(p_project_id uuid, p_stage text)
RETURNS reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p projects; r reviews; reviewer uuid;
BEGIN
  SELECT * INTO p FROM projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT is_project_member(p_project_id) THEN RAISE EXCEPTION 'Project not accessible'; END IF;
  IF p.current_stage <> p_stage OR p.current_stage_status NOT IN ('in_progress','not_started') THEN RAISE EXCEPTION 'Stage is not ready for review'; END IF;
  IF EXISTS (SELECT 1 FROM workspaces WHERE id=p.workspace_id AND type='personal') THEN RAISE EXCEPTION 'Use personal completion or invite a reviewer'; END IF;
  SELECT pm.user_id INTO reviewer FROM project_members pm WHERE pm.project_id=p.id AND pm.role IN ('supervisor','reviewer') LIMIT 1;
  UPDATE projects SET current_stage_status='pending_review' WHERE id=p.id;
  INSERT INTO reviews(project_id,stage,submitted_by,reviewer_id,status)
  VALUES(p.id,p_stage,auth.uid(),reviewer,'pending') RETURNING * INTO r;
  INSERT INTO audit_events(actor_id,workspace_id,project_id,action,stage,previous_state,new_state)
  VALUES(auth.uid(),p.workspace_id,p.id,'stage_submitted_for_review',p_stage,p.current_stage_status,'pending_review');
  IF reviewer IS NOT NULL THEN
    INSERT INTO notifications(user_id,type,project_id,review_id) VALUES(reviewer,'review_requested',p.id,r.id);
  END IF;
  RETURN r;
END; $$;
GRANT EXECUTE ON FUNCTION submit_stage_for_review(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION decide_stage_review(
  p_review_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r reviews; p projects; old_stage_status text; idx int; next_stage text;
BEGIN
  SELECT * INTO r FROM reviews WHERE id=p_review_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RAISE EXCEPTION 'Review is not pending'; END IF;
  IF NOT is_project_supervisor(r.project_id) THEN RAISE EXCEPTION 'Reviewer permission required'; END IF;
  IF p_decision NOT IN ('approved','changes_requested','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF p_decision='changes_requested' AND nullif(trim(p_note),'') IS NULL THEN RAISE EXCEPTION 'Decision note is required'; END IF;
  SELECT * INTO p FROM projects WHERE id=r.project_id FOR UPDATE;
  old_stage_status := p.current_stage_status;
  UPDATE reviews SET status=p_decision,reviewer_id=auth.uid(),reviewed_at=now(),decision_note=nullif(trim(p_note),'') WHERE id=r.id;
  IF p_decision='approved' THEN
    idx := array_position(ARRAY['research_question','literature_review','data_collection','data_qc','methodology','analysis','results','manuscript'], p.current_stage);
    IF idx < 8 THEN
      next_stage := (ARRAY['research_question','literature_review','data_collection','data_qc','methodology','analysis','results','manuscript'])[idx+1];
      UPDATE projects SET current_stage=next_stage,current_stage_status='not_started' WHERE id=p.id;
    ELSE
      UPDATE projects SET current_stage_status='approved',status='completed' WHERE id=p.id;
    END IF;
  ELSE
    UPDATE projects SET current_stage_status='in_progress' WHERE id=p.id;
  END IF;
  SELECT * INTO p FROM projects WHERE id=p.id;
  INSERT INTO audit_events(actor_id,workspace_id,project_id,action,stage,previous_state,new_state,review_decision,decision_note)
  VALUES(auth.uid(),p.workspace_id,p.id,'review_decision',r.stage,old_stage_status,p.current_stage_status,p_decision,p_note);
  INSERT INTO notifications(user_id,type,project_id,review_id) VALUES(r.submitted_by,'review_decided',p.id,r.id);
  RETURN p;
END; $$;
GRANT EXECUTE ON FUNCTION decide_stage_review(uuid,text,text) TO authenticated;

/* Journals are shared scholarly metadata; only trusted server jobs should mutate them. */
DROP POLICY IF EXISTS insert_journals ON journals;
DROP POLICY IF EXISTS update_journals ON journals;
DROP POLICY IF EXISTS delete_journals ON journals;

/* Seed no fake journal data: external metadata must be verified and timestamped. */
CREATE TABLE IF NOT EXISTS institution_setup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  domain text,
  full_name text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE institution_setup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY institution_setup_requests_select ON institution_setup_requests FOR SELECT TO authenticated USING (requester_id=auth.uid());
CREATE POLICY institution_setup_requests_insert ON institution_setup_requests FOR INSERT TO authenticated WITH CHECK (requester_id=auth.uid());

CREATE OR REPLACE FUNCTION request_institution_setup(p_institution_name text,p_domain text DEFAULT NULL,p_message text DEFAULT NULL,p_full_name text DEFAULT NULL)
RETURNS institution_setup_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r institution_setup_requests;
BEGIN
  INSERT INTO institution_setup_requests(requester_id,institution_name,domain,message,full_name)
  VALUES(auth.uid(),trim(p_institution_name),nullif(trim(p_domain),''),nullif(trim(p_message),''),nullif(trim(p_full_name),'')) RETURNING * INTO r;
  RETURN r;
END; $$;
GRANT EXECUTE ON FUNCTION request_institution_setup(text,text,text,text) TO authenticated;

/* Backfill explicit workspace memberships for existing accounts without changing their active workspace. */
INSERT INTO workspace_members(workspace_id,user_id,role)
SELECT p.workspace_id,p.id,CASE WHEN p.role='admin' THEN 'admin' ELSE 'member' END
FROM profiles p
ON CONFLICT (workspace_id,user_id) DO NOTHING;

/* Backfill initial project membership for existing projects so legacy projects remain operable. */
INSERT INTO project_members(project_id,user_id,role)
SELECT p.id, pr.id, 'researcher'
FROM projects p JOIN profiles pr ON pr.workspace_id=p.workspace_id
WHERE NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=pr.id)
  AND pr.role <> 'admin'
ON CONFLICT (project_id,user_id) DO NOTHING;
