/*
# ResearchAtlas Foundation Schema

## Overview
Creates the complete database schema for ResearchAtlas, a research lifecycle platform.
This migration establishes workspace architecture, institutional hierarchy, authentication,
projects with 8-stage research workflow, tasks, reviews, comments, notifications,
publications, journals, and audit trails.

## New Tables

### Core / Workspace
- `institutions` - Universities and research organizations
- `workspaces` - Primary tenancy boundary (personal or institution)
- `faculties` - Faculty-level grouping within institutions
- `departments` - Department-level grouping within faculties
- `research_groups` - Research groups within departments
- `profiles` - User profiles extending auth.users with workspace and role info

### Research
- `projects` - Research projects with 8-stage workflow
- `project_members` - Researchers, supervisors, reviewers on a project
- `tasks` - Granular tasks within a project stage
- `documents` - Files uploaded to projects
- `comments` - Threaded comments with @mentions and stage linking
- `reviews` - Supervisor review records for stage approval
- `notifications` - User notifications

### Publication
- `publications` - Manuscript/publication records linked to projects
- `publication_journal_matches` - Journal match suggestions for publications
- `journals` - Cached journal metadata from OpenAlex/Crossref

### Governance
- `audit_events` - Append-only audit trail for state transitions and decisions

## Security
- RLS enabled on EVERY table
- Workspace-scoped tables enforce access through workspace membership
- Personal workspace: owner has full CRUD
- Institution workspace: members access through project membership or institutional role
- Review decisions and stage transitions are controlled server-side
- Audit trail is append-only (no UPDATE or DELETE policies)
*/

-- ============ INSTITUTIONS ============
CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  plan text NOT NULL DEFAULT 'institution' CHECK (plan IN ('institution', 'enterprise')),
  created_at timestamptz DEFAULT now()
);

-- ============ WORKSPACES ============
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('personal', 'institution')),
  institution_id uuid REFERENCES institutions(id) ON DELETE CASCADE,
  owner_id uuid,  -- references auth.users but no FK (personal workspace owner)
  created_at timestamptz DEFAULT now(),
  CONSTRAINT workspace_type_check CHECK (
    (type = 'personal' AND institution_id IS NULL AND owner_id IS NOT NULL) OR
    (type = 'institution' AND institution_id IS NOT NULL AND owner_id IS NULL)
  )
);

-- ============ FACULTIES ============
CREATE TABLE IF NOT EXISTS faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ DEPARTMENTS ============
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ RESEARCH GROUPS ============
CREATE TABLE IF NOT EXISTS research_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'researcher' CHECK (role IN ('researcher', 'supervisor', 'admin')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  research_group_id uuid REFERENCES research_groups(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  template_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  current_stage text NOT NULL DEFAULT 'research_question' CHECK (current_stage IN (
    'research_question', 'literature_review', 'data_collection', 'data_qc',
    'methodology', 'analysis', 'results', 'manuscript'
  )),
  current_stage_status text NOT NULL DEFAULT 'not_started' CHECK (current_stage_status IN (
    'not_started', 'in_progress', 'pending_review', 'approved'
  )),
  start_date date,
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- ============ PROJECT MEMBERS ============
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'researcher' CHECK (role IN ('researcher', 'supervisor', 'reviewer', 'collaborator')),
  added_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- ============ TASKS ============
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stage text NOT NULL CHECK (stage IN (
    'research_question', 'literature_review', 'data_collection', 'data_qc',
    'methodology', 'analysis', 'results', 'manuscript'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stage text CHECK (stage IN (
    'research_question', 'literature_review', 'data_collection', 'data_qc',
    'methodology', 'analysis', 'results', 'manuscript'
  )),
  created_at timestamptz DEFAULT now()
);

-- ============ COMMENTS ============
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  stage text CHECK (stage IN (
    'research_question', 'literature_review', 'data_collection', 'data_qc',
    'methodology', 'analysis', 'results', 'manuscript'
  )),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN (
    'research_question', 'literature_review', 'data_collection', 'data_qc',
    'methodology', 'analysis', 'results', 'manuscript'
  )),
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'changes_requested', 'approved', 'rejected')),
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_note text
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'comment_added', 'review_requested', 'review_decided', 'mention',
    'publication_opportunity'
  )),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ JOURNALS (cached metadata) ============
CREATE TABLE IF NOT EXISTS journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discipline text,
  subdiscipline text,
  scope_description text,
  article_types text[],
  issn text,
  has_doi boolean DEFAULT false,
  open_access boolean DEFAULT false,
  apc_status text NOT NULL DEFAULT 'unknown' CHECK (apc_status IN ('no_apc_indicated', 'apc_verified', 'apc_required', 'unknown')),
  publisher text,
  indexing text[],
  submission_url text,
  author_guidelines_url text,
  last_verified_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============ PUBLICATIONS ============
CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  output_type text NOT NULL DEFAULT 'research_article' CHECK (output_type IN (
    'research_article', 'review_article', 'systematic_review', 'short_communication',
    'case_study', 'conference_paper', 'technical_note'
  )),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN (
    'candidate', 'manuscript_prep', 'supervisor_reviewed', 'supervisor_approved',
    'journal_matched', 'journal_selected', 'submission_prep', 'submitted',
    'under_review', 'accepted', 'published'
  )),
  manuscript_draft text,
  google_doc_id text,
  google_doc_url text,
  google_doc_last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============ PUBLICATION JOURNAL MATCHES ============
CREATE TABLE IF NOT EXISTS publication_journal_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  scope_match_score numeric DEFAULT 0,
  why_match text,
  created_at timestamptz DEFAULT now()
);

-- ============ AUDIT EVENTS ============
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  stage text,
  previous_state text,
  new_state text,
  review_decision text,
  decision_note text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_institution ON workspaces(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(current_stage);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
CREATE INDEX IF NOT EXISTS idx_pub_journal_matches_pub ON publication_journal_matches(publication_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_project ON audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_faculties_institution ON faculties(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_research_groups_dept ON research_groups(department_id);

-- ============ RLS: Enable on ALL tables ============
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_journal_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============ Helper function: user's workspace_id ============
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS uuid AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============ Helper: is workspace member ============
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND workspace_id = ws_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============ Helper: is project member ============
CREATE OR REPLACE FUNCTION is_project_member(proj_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.project_id = proj_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = proj_id
    AND p.workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles prof
      WHERE prof.id = auth.uid()
      AND prof.workspace_id = p.workspace_id
      AND prof.role = 'admin'
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============ Helper: is project supervisor/reviewer ============
CREATE OR REPLACE FUNCTION is_project_supervisor(proj_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = proj_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('supervisor', 'reviewer')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============ INSTITUTIONS POLICIES ============
-- Institution data is visible to all workspace members of that institution
DROP POLICY IF EXISTS "select_institutions" ON institutions;
CREATE POLICY "select_institutions" ON institutions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = institutions.id AND p.id = auth.uid()
    )
  );

-- Only admins can create institutions (handled via edge function in practice)
DROP POLICY IF EXISTS "insert_institutions" ON institutions;
CREATE POLICY "insert_institutions" ON institutions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_institutions" ON institutions;
CREATE POLICY "update_institutions" ON institutions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = institutions.id AND p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = institutions.id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ WORKSPACES POLICIES ============
DROP POLICY IF EXISTS "select_workspaces" ON workspaces;
CREATE POLICY "select_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.workspace_id = workspaces.id AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_workspaces" ON workspaces;
CREATE POLICY "insert_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "update_workspaces" ON workspaces;
CREATE POLICY "update_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.workspace_id = workspaces.id AND p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.workspace_id = workspaces.id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ FACULTIES POLICIES ============
DROP POLICY IF EXISTS "select_faculties" ON faculties;
CREATE POLICY "select_faculties" ON faculties FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = faculties.institution_id AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_faculties" ON faculties;
CREATE POLICY "insert_faculties" ON faculties FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = faculties.institution_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "update_faculties" ON faculties;
CREATE POLICY "update_faculties" ON faculties FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = faculties.institution_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = faculties.institution_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delete_faculties" ON faculties;
CREATE POLICY "delete_faculties" ON faculties FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN profiles p ON p.workspace_id = w.id
      WHERE w.institution_id = faculties.institution_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ DEPARTMENTS POLICIES ============
DROP POLICY IF EXISTS "select_departments" ON departments;
CREATE POLICY "select_departments" ON departments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM faculties f
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE f.id = departments.faculty_id AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_departments" ON departments;
CREATE POLICY "insert_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM faculties f
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE f.id = departments.faculty_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "update_departments" ON departments;
CREATE POLICY "update_departments" ON departments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM faculties f
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE f.id = departments.faculty_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM faculties f
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE f.id = departments.faculty_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delete_departments" ON departments;
CREATE POLICY "delete_departments" ON departments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM faculties f
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE f.id = departments.faculty_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ RESEARCH GROUPS POLICIES ============
DROP POLICY IF EXISTS "select_research_groups" ON research_groups;
CREATE POLICY "select_research_groups" ON research_groups FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE d.id = research_groups.department_id AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_research_groups" ON research_groups;
CREATE POLICY "insert_research_groups" ON research_groups FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE d.id = research_groups.department_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "update_research_groups" ON research_groups;
CREATE POLICY "update_research_groups" ON research_groups FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE d.id = research_groups.department_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE d.id = research_groups.department_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delete_research_groups" ON research_groups;
CREATE POLICY "delete_research_groups" ON research_groups FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      JOIN workspaces w ON w.institution_id = f.institution_id
      JOIN profiles p ON p.workspace_id = w.id
      WHERE d.id = research_groups.department_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ PROFILES POLICIES ============
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = profiles.workspace_id
      AND (
        w.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p2
          WHERE p2.workspace_id = w.id AND p2.id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    id = auth.uid()
  );

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    id = auth.uid()
  ) WITH CHECK (
    id = auth.uid()
  );

-- ============ PROJECTS POLICIES ============
DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (
    is_workspace_member(projects.workspace_id)
  );

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (
    is_workspace_member(projects.workspace_id)
  );

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated USING (
    is_project_member(projects.id)
  ) WITH CHECK (
    is_workspace_member(projects.workspace_id)
  );

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (
    is_project_member(projects.id)
  );

-- ============ PROJECT MEMBERS POLICIES ============
DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (
    is_project_member(project_members.project_id)
  );

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(project_members.project_id)
  );

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated USING (
    is_project_member(project_members.project_id)
  ) WITH CHECK (
    is_project_member(project_members.project_id)
  );

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (
    is_project_member(project_members.project_id)
  );

-- ============ TASKS POLICIES ============
DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    is_project_member(tasks.project_id)
  );

DROP POLICY IF EXISTS "insert_tasks" ON tasks;
CREATE POLICY "insert_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(tasks.project_id)
  );

DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    is_project_member(tasks.project_id)
  ) WITH CHECK (
    is_project_member(tasks.project_id)
  );

DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    is_project_member(tasks.project_id)
  );

-- ============ DOCUMENTS POLICIES ============
DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    is_project_member(documents.project_id)
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(documents.project_id)
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated USING (
    is_project_member(documents.project_id)
  ) WITH CHECK (
    is_project_member(documents.project_id)
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    is_project_member(documents.project_id)
  );

-- ============ COMMENTS POLICIES ============
DROP POLICY IF EXISTS "select_comments" ON comments;
CREATE POLICY "select_comments" ON comments FOR SELECT
  TO authenticated USING (
    is_project_member(comments.project_id)
  );

DROP POLICY IF EXISTS "insert_comments" ON comments;
CREATE POLICY "insert_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(comments.project_id) AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "update_comments" ON comments;
CREATE POLICY "update_comments" ON comments FOR UPDATE
  TO authenticated USING (
    author_id = auth.uid()
) WITH CHECK (
    author_id = auth.uid()
  );

DROP POLICY IF EXISTS "delete_comments" ON comments;
CREATE POLICY "delete_comments" ON comments FOR DELETE
  TO authenticated USING (
    author_id = auth.uid()
  );

-- ============ REVIEWS POLICIES ============
DROP POLICY IF EXISTS "select_reviews" ON reviews;
CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO authenticated USING (
    is_project_member(reviews.project_id)
  );

DROP POLICY IF EXISTS "insert_reviews" ON reviews;
CREATE POLICY "insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(reviews.project_id) AND submitted_by = auth.uid()
  );

-- Only supervisors/reviewers can update reviews (approve/reject/request changes)
DROP POLICY IF EXISTS "update_reviews" ON reviews;
CREATE POLICY "update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (
    is_project_supervisor(reviews.project_id)
  ) WITH CHECK (
    is_project_supervisor(reviews.project_id)
  );

-- ============ NOTIFICATIONS POLICIES ============
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============ JOURNALS POLICIES (readable by all authenticated users) ============
DROP POLICY IF EXISTS "select_journals" ON journals;
CREATE POLICY "select_journals" ON journals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_journals" ON journals;
CREATE POLICY "insert_journals" ON journals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_journals" ON journals;
CREATE POLICY "update_journals" ON journals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============ PUBLICATIONS POLICIES ============
DROP POLICY IF EXISTS "select_publications" ON publications;
CREATE POLICY "select_publications" ON publications FOR SELECT
  TO authenticated USING (
    is_project_member(publications.project_id)
  );

DROP POLICY IF EXISTS "insert_publications" ON publications;
CREATE POLICY "insert_publications" ON publications FOR INSERT
  TO authenticated WITH CHECK (
    is_project_member(publications.project_id)
  );

DROP POLICY IF EXISTS "update_publications" ON publications;
CREATE POLICY "update_publications" ON publications FOR UPDATE
  TO authenticated USING (
    is_project_member(publications.project_id)
  ) WITH CHECK (
    is_project_member(publications.project_id)
  );

DROP POLICY IF EXISTS "delete_publications" ON publications;
CREATE POLICY "delete_publications" ON publications FOR DELETE
  TO authenticated USING (
    is_project_member(publications.project_id)
  );

-- ============ PUBLICATION JOURNAL MATCHES POLICIES ============
DROP POLICY IF EXISTS "select_pub_journal_matches" ON publication_journal_matches;
CREATE POLICY "select_pub_journal_matches" ON publication_journal_matches FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM publications pub
      WHERE pub.id = publication_journal_matches.publication_id
      AND is_project_member(pub.project_id)
    )
  );

DROP POLICY IF EXISTS "insert_pub_journal_matches" ON publication_journal_matches;
CREATE POLICY "insert_pub_journal_matches" ON publication_journal_matches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM publications pub
      WHERE pub.id = publication_journal_matches.publication_id
      AND is_project_member(pub.project_id)
    )
  );

DROP POLICY IF EXISTS "update_pub_journal_matches" ON publication_journal_matches;
CREATE POLICY "update_pub_journal_matches" ON publication_journal_matches FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM publications pub
      WHERE pub.id = publication_journal_matches.publication_id
      AND is_project_member(pub.project_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM publications pub
      WHERE pub.id = publication_journal_matches.publication_id
      AND is_project_member(pub.project_id)
    )
  );

DROP POLICY IF EXISTS "delete_pub_journal_matches" ON publication_journal_matches;
CREATE POLICY "delete_pub_journal_matches" ON publication_journal_matches FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM publications pub
      WHERE pub.id = publication_journal_matches.publication_id
      AND is_project_member(pub.project_id)
    )
  );

-- ============ AUDIT EVENTS POLICIES (append-only, read by workspace members) ============
DROP POLICY IF EXISTS "select_audit_events" ON audit_events;
CREATE POLICY "select_audit_events" ON audit_events FOR SELECT
  TO authenticated USING (
    workspace_id IS NULL
    OR is_workspace_member(audit_events.workspace_id)
    OR actor_id = auth.uid()
  );

DROP POLICY IF EXISTS "insert_audit_events" ON audit_events;
CREATE POLICY "insert_audit_events" ON audit_events FOR INSERT
  TO authenticated WITH CHECK (true);

-- No UPDATE or DELETE policies on audit_events (append-only)

-- ============ TRIGGER: Auto-create profile on signup ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile will be created by the frontend after onboarding choice
  -- This trigger ensures we don't fail if no profile exists yet
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
