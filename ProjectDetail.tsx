import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  STAGES,
  STAGE_LABELS,
  STAGE_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  type Project,
  type Task,
  type Review,
  type Comment,
  type Profile,
  type ProjectMember,
  type StageName,
  type StageStatus,
  type ReviewStatus,
} from '@/lib/types';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  X,
  AlertCircle,
  ListTodo,
} from 'lucide-react';

export default function ProjectDetail({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const { profile, workspace } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activeStage, setActiveStage] = useState<StageName>('research_question');
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'researcher' | 'supervisor' | 'reviewer'>('supervisor');
  const [newComment, setNewComment] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPersonal = workspace?.type === 'personal';
  const isSupervisor = members.some(
    (m) => m.user_id === profile?.id && (m.role === 'supervisor' || m.role === 'reviewer')
  );
  const isMember = members.some((m) => m.user_id === profile?.id);

  const loadData = useCallback(async () => {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
    setProject(proj as Project | null);
    if (proj) setActiveStage((proj as Project).current_stage);

    const { data: taskData } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at');
    setTasks((taskData ?? []) as Task[]);

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*), submitter:profiles!reviews_submitted_by_fkey(*)')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });
    setReviews((reviewData ?? []) as Review[]);

    const { data: commentData } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setComments((commentData ?? []) as Comment[]);

    const { data: memberData } = await supabase
      .from('project_members')
      .select('*, profiles(*)')
      .eq('project_id', projectId);
    setMembers((memberData ?? []) as ProjectMember[]);

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stageTasks = tasks.filter((t) => t.stage === activeStage);
  const stageReviews = reviews.filter((r) => r.stage === activeStage);
  const stageComments = comments.filter((c) => c.stage === activeStage);

  const updateStageStatus = async (_stage: StageName, status: StageStatus) => {
    if (!project) return;
    setError(null);
    if (status !== 'in_progress') {
      setError('Stage changes are controlled by the ResearchAtlas workflow. Use the available workflow action.');
      return;
    }
    const { error } = await supabase.from('projects').update({ current_stage_status: 'in_progress' }).eq('id', projectId);
    if (error) { setError(error.message); return; }
    setProject({ ...project, current_stage_status: 'in_progress' });
  };
  const markInProgress = () => updateStageStatus(activeStage, 'in_progress');

  const submitForReview = async () => {
    if (!project || !profile) return;
    setSubmitting(true); setError(null);
    const { error } = await supabase.rpc('submit_stage_for_review', {
      p_project_id: projectId, p_stage: activeStage,
    });
    if (error) setError(error.message);
    setSubmitting(false);
    await loadData();
  };
  const markStageComplete = async () => {
    if (!project) return;
    setSubmitting(true); setError(null);
    const { error } = await supabase.rpc('personal_complete_stage', { p_project_id: projectId });
    if (error) setError(error.message);
    setSubmitting(false);
    await loadData();
  };
  const handleReviewDecision = async (decision: ReviewStatus) => {
    if (!['approved','changes_requested','rejected'].includes(decision)) return;
    if (!reviewNote && decision === 'changes_requested') { setError('A decision note is required when requesting changes.'); return; }
    setSubmitting(true); setError(null);
    const pendingReview = stageReviews.find((r) => r.status === 'pending');
    if (!pendingReview) { setError('No pending review found.'); setSubmitting(false); return; }
    const { error } = await supabase.rpc('decide_stage_review', {
      p_review_id: pendingReview.id, p_decision: decision, p_note: reviewNote || null,
    });
    if (error) setError(error.message);
    setReviewNote(''); setSubmitting(false); await loadData();
  };
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    await supabase.from('tasks').insert({
      project_id: projectId,
      title: newTaskTitle,
      stage: activeStage,
    });
    setNewTaskTitle('');
    setShowAddTask(false);
    await loadData();
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    await loadData();
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment || !profile) return;
    await supabase.from('comments').insert({
      project_id: projectId,
      stage: activeStage,
      author_id: profile.id,
      body: newComment,
    });
    setNewComment('');
    await loadData();
  };

  const addProjectMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      setError('Enter an email to assign a project member.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { data: memberProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newMemberEmail.trim())
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!memberProfile) {
        throw new Error('No user with that email exists in ResearchAtlas yet.');
      }

      const { error: insertError } = await supabase.from('project_members').upsert({
        project_id: projectId,
        user_id: memberProfile.id,
        role: newMemberRole,
      }, { onConflict: 'project_id,user_id' });

      if (insertError) throw insertError;

      setNewMemberEmail('');
      setNewMemberRole('supervisor');
      setShowAddMember(false);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to assign project member.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading project...</div>;
  if (!project) return <div className="page-error">Project not found.</div>;

  const currentStageStatus = project.current_stage === activeStage
    ? project.current_stage_status
    : 'approved';

  return (
    <div className="project-detail-page">
      <div className="project-detail-header">
        <button className="back-link" onClick={onBack}>
          <ArrowRight size={16} className="rotate-180" /> All projects
        </button>
        <h1>{project.title}</h1>
        {project.description && <p className="project-detail-desc">{project.description}</p>}
        {error && <div className="error-banner"><AlertCircle size={16} /> {error}</div>}
      </div>

      <div className="stage-progress-bar">
        {STAGES.map((stage, index) => {
          const isComplete = STAGES.findIndex((s) => s.key === project.current_stage) > index
            || (project.current_stage === stage.key && project.current_stage_status === 'approved');
          const isCurrent = project.current_stage === stage.key;
          return (
            <button
              key={stage.key}
              className={`stage-progress-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''} ${activeStage === stage.key ? 'active' : ''}`}
              onClick={() => setActiveStage(stage.key)}
            >
              <span className="stage-progress-number">{stage.number}</span>
              <span className="stage-progress-label">{stage.label}</span>
            </button>
          );
        })}
      </div>

      <div className="project-detail-grid">
        <div className="project-detail-main">
          <div className="stage-panel">
            <div className="stage-panel-header">
              <div>
                <h2>{STAGE_LABELS[activeStage]}</h2>
                <span className={`stage-status-badge ${currentStageStatus}`}>
                  {STAGE_STATUS_LABELS[currentStageStatus]}
                </span>
              </div>
              <button className="button button-outline button-small" onClick={() => setShowAddTask(!showAddTask)}>
                <Plus size={14} /> Add task
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={addTask} className="inline-form">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                />
                <button type="submit" className="button button-solid button-small">Add</button>
                <button type="button" className="button button-outline button-small" onClick={() => setShowAddTask(false)}>
                  <X size={14} />
                </button>
              </form>
            )}

            <div className="task-list">
              {stageTasks.length === 0 ? (
                <p className="empty-hint">No tasks for this stage yet.</p>
              ) : (
                stageTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <button
                      className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                      onClick={() => toggleTask(task)}
                      aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.status === 'completed' && <Check size={14} />}
                    </button>
                    <div className="task-info">
                      <span className={task.status === 'completed' ? 'task-done' : ''}>{task.title}</span>
                      <span className="task-priority">{task.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="stage-actions">
              {currentStageStatus === 'not_started' && isMember && (
                <button className="button button-solid" onClick={markInProgress}>
                  Start working <Clock size={15} />
                </button>
              )}
              {currentStageStatus === 'in_progress' && isMember && (
                <>
                  {isPersonal ? (
                    <button className="button button-solid" onClick={markStageComplete} disabled={submitting}>
                      <CheckCircle2 size={15} /> Mark Stage Complete
                    </button>
                  ) : (
                    <button className="button button-solid" onClick={submitForReview} disabled={submitting}>
                      <Send size={15} /> Submit for Review
                    </button>
                  )}
                </>
              )}
              {currentStageStatus === 'pending_review' && isSupervisor && (
                <div className="review-actions">
                  <p className="review-prompt">This stage is awaiting your review.</p>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Decision note (required for changes, optional for approve)..."
                    rows={2}
                  />
                  <div className="review-buttons">
                    <button
                      className="button button-solid button-small review-approve"
                      onClick={() => handleReviewDecision('approved')}
                      disabled={submitting}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      className="button button-outline button-small review-changes"
                      onClick={() => handleReviewDecision('changes_requested')}
                      disabled={submitting}
                    >
                      Request Changes
                    </button>
                    <button
                      className="button button-outline button-small review-reject"
                      onClick={() => handleReviewDecision('rejected')}
                      disabled={submitting}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              {currentStageStatus === 'pending_review' && !isSupervisor && (
                <p className="review-waiting">Awaiting review from your supervisor.</p>
              )}
              {currentStageStatus === 'approved' && (
                <p className="review-approved-msg">
                  <CheckCircle2 size={16} /> This stage has been approved.
                </p>
              )}
            </div>
          </div>

          <div className="comments-panel">
            <h3><MessageSquare size={18} /> Comments</h3>
            <div className="comments-list">
              {stageComments.length === 0 ? (
                <p className="empty-hint">No comments for this stage yet.</p>
              ) : (
                stageComments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {(comment.author as unknown as Profile)?.full_name?.[0] ?? '?'}
                    </div>
                    <div className="comment-body">
                      <strong>{(comment.author as unknown as Profile)?.full_name ?? 'Unknown'}</strong>
                      <p>{comment.body}</p>
                      <span className="comment-time">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={addComment} className="comment-form">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button type="submit" className="button button-solid button-small">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="project-detail-sidebar">
          <div className="sidebar-card">
            <h3><ListTodo size={18} /> Stage Reviews</h3>
            <div className="review-history">
              {stageReviews.length === 0 ? (
                <p className="empty-hint">No reviews submitted for this stage.</p>
              ) : (
                stageReviews.map((review) => (
                  <div key={review.id} className="review-history-item">
                    <span className={`review-status-dot ${review.status}`} />
                    <div>
                      <span className="review-status-text">{REVIEW_STATUS_LABELS[review.status]}</span>
                      {review.decision_note && <p className="review-note-text">{review.decision_note}</p>}
                      <span className="review-time">{new Date(review.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <h3><FileText size={18} /> Project Members</h3>
              <button className="button button-outline button-small" onClick={() => setShowAddMember(!showAddMember)}>
                <Plus size={12} /> Add
              </button>
            </div>

            {showAddMember && (
              <form onSubmit={addProjectMember} className="inline-form" style={{ marginTop: '0.75rem' }}>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="member@email.com"
                />
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as 'researcher' | 'supervisor' | 'reviewer')}>
                  <option value="supervisor">Supervisor</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="researcher">Researcher</option>
                </select>
                <button type="submit" className="button button-solid button-small" disabled={submitting}>Add</button>
              </form>
            )}

            <div className="member-list">
              {members.length === 0 ? (
                <p className="empty-hint">No additional members.</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="member-item">
                    <div className="member-avatar">
                      {member.profiles?.full_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <strong>{member.profiles?.full_name ?? 'Unknown'}</strong>
                      <span>{member.role}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
