import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { STAGES, STAGE_LABELS, STAGE_STATUS_LABELS, type Project, type StageName } from '@/lib/types';
import { ArrowRight, Plus, X } from 'lucide-react';

const TEMPLATES = [
  { id: 'phd_research', label: 'PhD Research' },
  { id: 'masters_dissertation', label: 'Masters Dissertation' },
  { id: 'systematic_review', label: 'Systematic Review' },
  { id: 'research_article', label: 'Research Article' },
  { id: 'field_study', label: 'Field Study' },
  { id: 'laboratory_study', label: 'Laboratory Study' },
  { id: 'engineering_research', label: 'Engineering Research' },
  { id: 'blank', label: 'Blank Project' },
];

export default function Projects({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { workspace } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTemplate, setNewTemplate] = useState('blank');
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, [workspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !newTitle) return;
    setCreating(true);
    const { data, error } = await supabase.rpc('create_project', {
      p_workspace_id: workspace.id,
      p_title: newTitle,
      p_description: newDescription || null,
      p_template_id: newTemplate !== 'blank' ? newTemplate : null,
      p_start_date: null,
      p_due_date: null,
    });
    setCreating(false);
    if (error) return;
    setShowCreate(false);
    setNewTitle('');
    setNewDescription('');
    setNewTemplate('blank');
    await loadProjects();
    if (data) onOpenProject((data as Project).id);
  };

  if (loading) return <div className="page-loading">Loading projects...</div>;

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>My Projects</h1>
          <p className="page-subtitle">Manage your research projects across the full lifecycle.</p>
        </div>
        <button className="button button-solid" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state-large">
          <h3>No projects yet</h3>
          <p>Create your first research project to get started with the eight-stage workflow.</p>
          <button className="button button-solid" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <button
              key={project.id}
              className="project-card"
              onClick={() => onOpenProject(project.id)}
            >
              <div className="project-card-header">
                <span className={`project-status-badge ${project.status}`}>{project.status}</span>
                <span className="project-stage-badge">
                  {STAGES.find((s) => s.key === project.current_stage)?.number}
                </span>
              </div>
              <h3>{project.title}</h3>
              {project.description && <p className="project-card-desc">{project.description}</p>}
              <div className="project-card-footer">
                <span className="project-stage-name">{STAGE_LABELS[project.current_stage]}</span>
                <span className={`project-stage-status ${project.current_stage_status}`}>
                  {STAGE_STATUS_LABELS[project.current_stage_status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <label className="form-field">
                <span>Project title</span>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="Groundwater Recharge Study"
                />
              </label>
              <label className="form-field">
                <span>Description (optional)</span>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the research project"
                />
              </label>
              <label className="form-field">
                <span>Template</span>
                <select value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-solid" disabled={creating}>
                  {creating ? 'Creating...' : 'Create project'} <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
