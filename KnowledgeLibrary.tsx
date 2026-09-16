import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { DocumentItem, Project } from '@/lib/types';
import { FileText, Plus, X, Upload } from 'lucide-react';

export default function KnowledgeLibrary() {
  const { workspace } = useAuth();
  const [documents, setDocuments] = useState<(DocumentItem & { project?: Project })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const load = async () => {
    if (!workspace) return;
    const { data: projs } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id);
    setProjects((projs ?? []) as Project[]);

    const projectIds = (projs ?? []).map((p: Project) => p.id);
    if (projectIds.length === 0) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    const { data: docs } = await supabase
      .from('documents')
      .select('*, project:projects(*)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    setDocuments((docs ?? []) as (DocumentItem & { project?: Project })[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [workspace]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newProjectId) return;
    await supabase.from('documents').insert({
      project_id: newProjectId,
      title: newTitle,
      file_url: newUrl || null,
    });
    setNewTitle('');
    setNewProjectId('');
    setNewUrl('');
    setShowAdd(false);
    await load();
  };

  if (loading) return <div className="page-loading">Loading library...</div>;

  return (
    <div className="library-page">
      <div className="page-header">
        <div>
          <h1>Knowledge Library</h1>
          <p className="page-subtitle">Research materials, literature, and project artifacts connected to your work.</p>
        </div>
        <button className="button button-solid" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state-large">
          <h3>No documents yet</h3>
          <p>Upload literature, notes, methodology resources, or project artifacts.</p>
        </div>
      ) : (
        <div className="doc-grid">
          {documents.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon"><FileText size={20} /></div>
              <div className="doc-info">
                <strong>{doc.title}</strong>
                <span>{doc.project?.title ?? 'Unknown project'}</span>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="doc-link">
                    Open file
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Document</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <label className="form-field">
                <span>Title</span>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="Literature review notes" />
              </label>
              <label className="form-field">
                <span>Project</span>
                <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} required>
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>File URL (optional)</span>
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="button button-solid"><Upload size={15} /> Add document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
