import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { STAGES, STAGE_LABELS, type Project, type Publication } from '@/lib/types';
import { BarChart3, TrendingUp, FileText, CheckCircle2, Users, Clock } from 'lucide-react';

interface AnalyticsData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingReviews: number;
  manuscriptsInPrep: number;
  submittedPubs: number;
  publishedThisYear: number;
  totalResearchers: number;
  totalSupervisors: number;
  stageBreakdown: Record<string, number>;
  projectsByStatus: { active: number; completed: number; archived: number };
}

export default function Analytics() {
  const { workspace } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspace.id);
      const allProjects = (projects ?? []) as Project[];

      const projectIds = allProjects.map((p) => p.id);
      let pubs: Publication[] = [];
      if (projectIds.length > 0) {
        const { data: pubData } = await supabase
          .from('publications')
          .select('*')
          .in('project_id', projectIds);
        pubs = (pubData ?? []) as Publication[];
      }

      const { count: pendingCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'pending');

      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .eq('workspace_id', workspace.id);
      const profiles = (profs ?? []) as { role: string }[];

      const breakdown: Record<string, number> = {};
      for (const s of STAGES) breakdown[s.key] = 0;
      for (const p of allProjects) breakdown[p.current_stage] = (breakdown[p.current_stage] ?? 0) + 1;

      const year = new Date().getFullYear();
      setData({
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter((p) => p.status === 'active').length,
        completedProjects: allProjects.filter((p) => p.status === 'completed').length,
        pendingReviews: pendingCount ?? 0,
        manuscriptsInPrep: pubs.filter((p) => !['published', 'accepted', 'submitted', 'under_review'].includes(p.status)).length,
        submittedPubs: pubs.filter((p) => ['submitted', 'under_review'].includes(p.status)).length,
        publishedThisYear: pubs.filter((p) => p.status === 'published' && new Date(p.created_at).getFullYear() === year).length,
        totalResearchers: profiles.filter((p) => p.role === 'researcher').length,
        totalSupervisors: profiles.filter((p) => p.role === 'supervisor').length,
        stageBreakdown: breakdown,
        projectsByStatus: {
          active: allProjects.filter((p) => p.status === 'active').length,
          completed: allProjects.filter((p) => p.status === 'completed').length,
          archived: allProjects.filter((p) => p.status === 'archived').length,
        },
      });
      setLoading(false);
    })();
  }, [workspace]);

  if (loading) return <div className="page-loading">Loading analytics...</div>;
  if (!data) return <div className="page-error">Unable to load analytics.</div>;

  const metrics = [
    { icon: BarChart3, label: 'Active Projects', value: data.activeProjects, tone: 'stat-blue' },
    { icon: Users, label: 'Researchers', value: data.totalResearchers, tone: 'stat-green' },
    { icon: CheckCircle2, label: 'Supervisors', value: data.totalSupervisors, tone: 'stat-yellow' },
    { icon: Clock, label: 'Projects Awaiting Review', value: data.pendingReviews, tone: 'stat-red' },
    { icon: CheckCircle2, label: 'Completed Research', value: data.completedProjects, tone: 'stat-teal' },
    { icon: FileText, label: 'Manuscripts in Preparation', value: data.manuscriptsInPrep, tone: 'stat-blue' },
    { icon: TrendingUp, label: 'Submitted for Publication', value: data.submittedPubs, tone: 'stat-green' },
    { icon: TrendingUp, label: 'Published This Year', value: data.publishedThisYear, tone: 'stat-yellow' },
  ];

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-subtitle">Institutional research pipeline and output metrics.</p>
        </div>
      </div>

      <div className="stat-grid">
        {metrics.map((m) => (
          <div key={m.label} className="stat-card">
            <div className={`stat-icon ${m.tone}`}><m.icon size={20} /></div>
            <div className="stat-value">{m.value}</div>
            <div className="stat-label">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="analytics-section">
          <h3>Research Pipeline</h3>
          <p className="section-desc">Where research is accumulating across the lifecycle.</p>
          <div className="pipeline-visual">
            {STAGES.map((stage, index) => {
              const count = data.stageBreakdown[stage.key] ?? 0;
              const max = Math.max(...Object.values(data.stageBreakdown), 1);
              const height = (count / max) * 100;
              return (
                <div key={stage.key} className="pipeline-bar-col">
                  <div className="pipeline-bar-container">
                    <div className={`pipeline-bar stage-${index + 1}`} style={{ height: `${height}%` }} />
                  </div>
                  <span className="pipeline-bar-count">{count}</span>
                  <span className="pipeline-bar-label">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="analytics-section">
          <h3>Project Status</h3>
          <p className="section-desc">Distribution of projects by status.</p>
          <div className="status-distribution">
            <div className="status-bar-row">
              <span>Active</span>
              <div className="status-bar-track"><div className="status-bar-fill active" style={{ width: `${data.totalProjects ? (data.projectsByStatus.active / data.totalProjects) * 100 : 0}%` }} /></div>
              <span className="status-bar-count">{data.projectsByStatus.active}</span>
            </div>
            <div className="status-bar-row">
              <span>Completed</span>
              <div className="status-bar-track"><div className="status-bar-fill completed" style={{ width: `${data.totalProjects ? (data.projectsByStatus.completed / data.totalProjects) * 100 : 0}%` }} /></div>
              <span className="status-bar-count">{data.projectsByStatus.completed}</span>
            </div>
            <div className="status-bar-row">
              <span>Archived</span>
              <div className="status-bar-track"><div className="status-bar-fill archived" style={{ width: `${data.totalProjects ? (data.projectsByStatus.archived / data.totalProjects) * 100 : 0}%` }} /></div>
              <span className="status-bar-count">{data.projectsByStatus.archived}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
