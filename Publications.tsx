import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  PUBLICATION_STATUS_LABELS,
  OUTPUT_TYPE_LABELS,
  type Publication,
  type Project,
  type PublicationJournalMatch,
  type Journal,
  type OutputType,
} from '@/lib/types';
import { ArrowRight, BookOpen, Check, ExternalLink, FileText, Plus, X, Sparkles } from 'lucide-react';
import type { PageKey } from '@/components/AppShell';

export default function Publications({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { workspace } = useAuth();
  const [publications, setPublications] = useState<(Publication & { project?: Project })[]>([]);
  const [opportunities, setOpportunities] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [outputType, setOutputType] = useState<OutputType>('research_article');
  const [matches, setMatches] = useState<Record<string, (PublicationJournalMatch & { journal?: Journal })[]>>({});

  const load = async () => {
    if (!workspace) return;
    const { data: projs } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });
    const allProjects = (projs ?? []) as Project[];

    const projectIds = allProjects.map((p) => p.id);
    let pubs: (Publication & { project?: Project })[] = [];
    if (projectIds.length > 0) {
      const { data: pubData } = await supabase
        .from('publications')
        .select('*, project:projects(*)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      pubs = (pubData ?? []) as (Publication & { project?: Project })[];
    }
    setPublications(pubs);

    const opps = allProjects.filter(
      (p) => p.status === 'completed' && !pubs.some((pub) => pub.project_id === p.id)
    );
    setOpportunities(opps);

    const matchMap: Record<string, (PublicationJournalMatch & { journal?: Journal })[]> = {};
    for (const pub of pubs) {
      const { data: matchData } = await supabase
        .from('publication_journal_matches')
        .select('*, journal:journals(*)')
        .eq('publication_id', pub.id)
        .order('scope_match_score', { ascending: false });
      matchMap[pub.id] = (matchData ?? []) as (PublicationJournalMatch & { journal?: Journal })[];
    }
    setMatches(matchMap);

    setProjects(allProjects);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [workspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    await supabase.from('publications').insert({
      project_id: selectedProjectId,
      output_type: outputType,
      status: 'manuscript_prep',
    });
    setShowCreate(false);
    setSelectedProjectId('');
    await load();
  };

  if (loading) return <div className="page-loading">Loading publications...</div>;

  return (
    <div className="publications-page">
      <div className="page-header">
        <div>
          <h1>Publications</h1>
          <p className="page-subtitle">Manage manuscripts, journal matches, and submission tracking.</p>
        </div>
        <button className="button button-solid" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create publication
        </button>
      </div>

      {opportunities.length > 0 && (
        <div className="opportunity-banner">
          <div className="opportunity-icon"><Sparkles size={20} /></div>
          <div>
            <strong>Potential publication opportunity</strong>
            <p>The following completed projects have no publication linked yet.</p>
          </div>
        </div>
      )}

      {opportunities.map((proj) => (
        <div key={proj.id} className="opportunity-card">
          <div className="opportunity-info">
            <strong>{proj.title}</strong>
            <div className="opportunity-checklist">
              <span><Check size={14} /> Project completed</span>
              <span><Check size={14} /> Results documented</span>
              <span className="muted">Manuscript not created</span>
            </div>
          </div>
          <button
            className="button button-solid button-small"
            onClick={() => { setSelectedProjectId(proj.id); setOutputType('research_article'); setShowCreate(true); }}
          >
            Create Publication <ArrowRight size={14} />
          </button>
        </div>
      ))}

      {publications.length === 0 && opportunities.length === 0 ? (
        <div className="empty-state-large">
          <h3>No publications yet</h3>
          <p>Complete a project and create a publication to start the manuscript workflow.</p>
          <button className="button button-outline" onClick={() => onNavigate('projects')}>
            Go to projects
          </button>
        </div>
      ) : (
        <div className="publication-list">
          {publications.map((pub) => (
            <div key={pub.id} className="publication-card">
              <div className="publication-header">
                <div>
                  <span className="pub-type-badge">{OUTPUT_TYPE_LABELS[pub.output_type]}</span>
                  <h3>{pub.project?.title ?? 'Unknown project'}</h3>
                </div>
                <span className={`pub-status-badge ${pub.status}`}>{PUBLICATION_STATUS_LABELS[pub.status]}</span>
              </div>

              <div className="publication-pipeline">
                {Object.entries(PUBLICATION_STATUS_LABELS).map(([key, label], index) => {
                  const statusOrder = ['candidate', 'manuscript_prep', 'supervisor_reviewed', 'supervisor_approved',
                    'journal_matched', 'journal_selected', 'submission_prep', 'submitted', 'under_review', 'accepted', 'published'];
                  const currentIndex = statusOrder.indexOf(pub.status);
                  const stepIndex = statusOrder.indexOf(key);
                  const isComplete = stepIndex <= currentIndex;
                  const isCurrent = key === pub.status;
                  return (
                    <div key={key} className={`pipeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                      <span className="pipeline-dot">{isComplete ? <Check size={10} /> : index + 1}</span>
                      <span className="pipeline-step-label">{label}</span>
                    </div>
                  );
                })}
              </div>

              {pub.google_doc_url && (
                <a href={pub.google_doc_url} target="_blank" rel="noopener noreferrer" className="button button-outline button-small">
                  <ExternalLink size={14} /> Open in Google Docs
                </a>
              )}

              {matches[pub.id] && matches[pub.id].length > 0 && (
                <div className="journal-matches">
                  <h4><BookOpen size={16} /> Journal Matches</h4>
                  {matches[pub.id].slice(0, 3).map((match) => (
                    <div key={match.id} className="journal-match-item">
                      <div>
                        <strong>{match.journal?.name ?? 'Unknown journal'}</strong>
                        {match.why_match && <p>{match.why_match}</p>}
                      </div>
                      <span className="match-score">{Math.round(match.scope_match_score)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Publication</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <label className="form-field">
                <span>Project</span>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} required>
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Output type</span>
                <select value={outputType} onChange={(e) => setOutputType(e.target.value as OutputType)}>
                  {Object.entries(OUTPUT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="button button-solid"><FileText size={15} /> Create publication</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
