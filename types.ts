export type WorkspaceType = 'personal' | 'institution';
export type UserRole = 'researcher' | 'supervisor' | 'admin';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type StageName =
  | 'research_question'
  | 'literature_review'
  | 'data_collection'
  | 'data_qc'
  | 'methodology'
  | 'analysis'
  | 'results'
  | 'manuscript';
export type StageStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type ReviewStatus = 'pending' | 'changes_requested' | 'approved' | 'rejected';
export type PublicationStatus =
  | 'candidate'
  | 'manuscript_prep'
  | 'supervisor_reviewed'
  | 'supervisor_approved'
  | 'journal_matched'
  | 'journal_selected'
  | 'submission_prep'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'published';
export type OutputType =
  | 'research_article'
  | 'review_article'
  | 'systematic_review'
  | 'short_communication'
  | 'case_study'
  | 'conference_paper'
  | 'technical_note';
export type APCStatus = 'no_apc_indicated' | 'apc_verified' | 'apc_required' | 'unknown';
export type NotificationType =
  | 'comment_added'
  | 'review_requested'
  | 'review_decided'
  | 'mention'
  | 'publication_opportunity';

export interface Institution {
  id: string;
  name: string;
  domain: string | null;
  plan: 'institution' | 'enterprise';
  created_at: string;
}

export interface WorkspaceMember { id: string; workspace_id: string; user_id: string; role: 'member' | 'admin'; created_at: string; }

export interface Workspace {
  id: string;
  type: WorkspaceType;
  institution_id: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface Faculty {
  id: string;
  institution_id: string;
  name: string;
  created_at: string;
}

export interface Department {
  id: string;
  faculty_id: string;
  name: string;
  created_at: string;
}

export interface ResearchGroup {
  id: string;
  department_id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  workspace_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  department_id: string | null;
  research_group_id: string | null;
  title: string;
  description: string | null;
  template_id: string | null;
  status: ProjectStatus;
  current_stage: StageName;
  current_stage_status: StageStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'researcher' | 'supervisor' | 'reviewer' | 'collaborator';
  added_at: string;
  profiles?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  stage: StageName;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  title: string;
  file_url: string | null;
  uploaded_by: string | null;
  stage: StageName | null;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  task_id: string | null;
  stage: StageName | null;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  edited_at: string | null;
  author?: Profile;
  replies?: Comment[];
}

export interface Review {
  id: string;
  project_id: string;
  stage: StageName;
  submitted_by: string;
  submitted_at: string;
  status: ReviewStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  decision_note: string | null;
  reviewer?: Profile;
  submitter?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  project_id: string | null;
  review_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
}

export interface Journal {
  id: string;
  name: string;
  discipline: string | null;
  subdiscipline: string | null;
  scope_description: string | null;
  article_types: string[] | null;
  issn: string | null;
  has_doi: boolean;
  open_access: boolean;
  apc_status: APCStatus;
  publisher: string | null;
  indexing: string[] | null;
  submission_url: string | null;
  author_guidelines_url: string | null;
  last_verified_at: string;
  created_at: string;
}

export interface Publication {
  id: string;
  project_id: string;
  output_type: OutputType;
  status: PublicationStatus;
  manuscript_draft: string | null;
  google_doc_id: string | null;
  google_doc_url: string | null;
  google_doc_last_synced_at: string | null;
  created_at: string;
}

export interface PublicationJournalMatch {
  id: string;
  publication_id: string;
  journal_id: string;
  scope_match_score: number;
  why_match: string | null;
  created_at: string;
  journal?: Journal;
}

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  workspace_id: string | null;
  project_id: string | null;
  action: string;
  stage: string | null;
  previous_state: string | null;
  new_state: string | null;
  review_decision: string | null;
  decision_note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const STAGES: { key: StageName; label: string; number: string }[] = [
  { key: 'research_question', label: 'Research Question', number: '01' },
  { key: 'literature_review', label: 'Literature Review', number: '02' },
  { key: 'data_collection', label: 'Data Collection', number: '03' },
  { key: 'data_qc', label: 'Data QC', number: '04' },
  { key: 'methodology', label: 'Methodology', number: '05' },
  { key: 'analysis', label: 'Analysis', number: '06' },
  { key: 'results', label: 'Results', number: '07' },
  { key: 'manuscript', label: 'Manuscript', number: '08' },
];

export const STAGE_LABELS: Record<StageName, string> = {
  research_question: 'Research Question',
  literature_review: 'Literature Review',
  data_collection: 'Data Collection',
  data_qc: 'Data QC',
  methodology: 'Methodology',
  analysis: 'Analysis',
  results: 'Results',
  manuscript: 'Manuscript',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  approved: 'Approved',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  candidate: 'Candidate',
  manuscript_prep: 'Manuscript Prep',
  supervisor_reviewed: 'Supervisor Reviewed',
  supervisor_approved: 'Supervisor Approved',
  journal_matched: 'Journal Matched',
  journal_selected: 'Journal Selected',
  submission_prep: 'Submission Prep',
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  published: 'Published',
};

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  research_article: 'Research Article',
  review_article: 'Review Article',
  systematic_review: 'Systematic Review',
  short_communication: 'Short Communication',
  case_study: 'Case Study',
  conference_paper: 'Conference Paper',
  technical_note: 'Technical Note',
};

export const APC_STATUS_LABELS: Record<APCStatus, string> = {
  no_apc_indicated: 'No APC indicated',
  apc_verified: 'APC verified',
  apc_required: 'APC required',
  unknown: 'Unknown',
};
