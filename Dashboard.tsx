import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { STAGES, STAGE_LABELS, type Project, type Publication } from '@/lib/types';
import { ArrowRight, FileText, CheckCircle2, BookOpen, TrendingUp } from 'lucide-react';
import type { PageKey } from '@/components/AppShell';

interface DashboardData {
  activeProjects: Project[];
  completedProjects: Project[];
  publications: Publication[];
  stageBreakdown: Record<string, number>;
}

export default function Dashboard({
  onOpenProject,
  onNavigate,
}: {
  onOpenProject: (id: string) => void;
  onNavigate: (page: PageKey) => void;
}) {
  const { profile, workspace } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
      const allProjects = (projects ?? []) as Project[];
      const active = allProjects.filter((p) => p.status === 'active');
      const completed = allProjects.filter((p) => p.status === 'completed');

      const projectIds = allProjects.map((p) => p.id);
      let pubs: Publication[] = [];
      if (projectIds.length > 0) {
        const { data: pubData } = await supabase
          .from('publications')
          .select('*')
          .in('project_id', projectIds);
        pubs = (pubData ?? []) as Publication[];
      }

      const breakdown: Record<string, number> = {};
      for (const s of STAGES) breakdown[s.key] = 0;
      for (const p of active) breakdown[p.current_stage] = (breakdown[p.current_stage] ?? 0) + 1;

      setData({
        activeProjects: active,
        completedProjects: completed,
        publications: pubs,
        stageBreakdown: breakdown,
      });
      setLoading(false);
    })();
  }, [workspace]);

  if (loading) return <div className="page-loading">Loading your research overview...</div>;
  if (!data) return <div className="page-error">Unable to load dashboard.</div>;

  const isPersonal = workspace?.type === 'personal';
  const year = new Date().getFullYear();
  const pubsThisYear = data.publications.filter(
    (p) => p.status === 'published' && new Date(p.created_at).getFullYear() === year
  ).length;
  const manuscriptsInProgress = data.publications.filter(
    (p) => !['published', 'accepted'].includes(p.status)
  ).length;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{isPersonal ? 'My Research' : 'Research Overview'}</h1>
          <p className="page-subtitle">
            {isPersonal
              ? 'Track your research projects and publications.'
              : 'An overview of research across your institution.'}
          </p>
        </div>
        <button className="button button-solid" onClick={() => onNavigate('projects')}>
          View all projects <ArrowRight size={15} />
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-blue"><BookOpen size={20} /></div>
          <div className="stat-value">{data.activeProjects.length}</div>
          <div className="stat-label">Active Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-green"><CheckCircle2 size={20} /></div>
          <div className="stat-value">{data.completedProjects.length}</div>
          <div className="stat-label">Completed Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-yellow"><FileText size={20} /></div>
          <div className="stat-value">{manuscriptsInProgress}</div>
          <div className="stat-label">Manuscripts in Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-teal"><TrendingUp size={20} /></div>
          <div className="stat-value">{pubsThisYear}</div>
          <div className="stat-label">Publications This Year</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3>Stage Breakdown</h3>
          <p className="section-desc">Where your active projects are in the research lifecycle.</p>
          <div className="stage-breakdown">
            {STAGES.map((stage) => {
              const count = data.stageBreakdown[stage.key] ?? 0;
              const max = Math.max(...Object.values(data.stageBreakdown), 1);
              const width = (count / max) * 100;
              return (
                <div className="stage-bar-row" key={stage.key}>
                  <span className="stage-bar-label">{stage.number} {stage.label}</span>
                  <div className="stage-bar-track">
                    <div className="stage-bar-fill" style={{ width: `${width}%` }} />
                  </div>
                  <span className="stage-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-section">
          <h3>Recent Projects</h3>
          <p className="section-desc">Your most recently updated research.</p>
          <div className="recent-projects">
            {data.activeProjects.length === 0 ? (
              <div className="empty-state">
                <p>No projects yet.</p>
                <button className="button button-outline" onClick={() => onNavigate('projects')}>
                  Create your first project
                </button>
              </div>
            ) : (
              data.activeProjects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  className="recent-project-item"
                  onClick={() => onOpenProject(project.id)}
                >
                  <div className="recent-project-info">
                    <strong>{project.title}</strong>
                    <span>{STAGE_LABELS[project.current_stage]}</span>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
