import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  BarChart3,
  Bell,
  BookOpen,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import KnowledgeLibrary from '@/pages/KnowledgeLibrary';
import Publications from '@/pages/Publications';
import JournalFinder from '@/pages/JournalFinder';
import ReviewQueue from '@/pages/ReviewQueue';
import InstitutionAdmin from '@/pages/InstitutionAdmin';
import Analytics from '@/pages/Analytics';
import SettingsPage from '@/pages/SettingsPage';

export type PageKey =
  | 'home'
  | 'projects'
  | 'library'
  | 'publications'
  | 'journals'
  | 'reviews'
  | 'institution'
  | 'analytics'
  | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof Home;
}

function getNavItems(role: UserRole, workspaceType: 'personal' | 'institution'): NavItem[] {
  if (workspaceType === 'personal') {
    return [
      { key: 'home', label: 'Home', icon: Home },
      { key: 'projects', label: 'My Projects', icon: LayoutGrid },
      { key: 'library', label: 'Knowledge Library', icon: BookOpen },
      { key: 'publications', label: 'Publications', icon: FileText },
      { key: 'journals', label: 'Journal Finder', icon: BookOpen },
      { key: 'settings', label: 'Settings', icon: Settings },
    ];
  }

  const items: NavItem[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'projects', label: 'My Projects', icon: LayoutGrid },
    { key: 'library', label: 'Knowledge Library', icon: BookOpen },
  ];

  if (role === 'supervisor') {
    items.push({ key: 'reviews', label: 'Review Queue', icon: ShieldCheck });
  }

  items.push({ key: 'publications', label: 'Publications', icon: FileText });
  items.push({ key: 'journals', label: 'Journal Finder', icon: BookOpen });

  if (role === 'admin') {
    items.unshift({ key: 'institution', label: 'Institution', icon: Users });
    items.splice(2, 0, { key: 'analytics', label: 'Analytics', icon: BarChart3 });
  }

  items.push({ key: 'settings', label: 'Settings', icon: Settings });
  return items;
}

export default function AppShell() {
  const { profile, workspace, signOut } = useAuth();
  const [page, setPage] = useState<PageKey>('home');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!profile || !workspace) return null;

  const navItems = getNavItems(profile.role, workspace.type);
  const currentNav = navItems.find((n) => n.key === page) ?? navItems[0];

  const navigate = (p: PageKey) => {
    setPage(p);
    setSelectedProjectId(null);
    setSidebarOpen(false);
  };

  const openProject = (id: string) => {
    setSelectedProjectId(id);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    if (selectedProjectId) {
      return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
    }
    switch (page) {
      case 'home':
        return <Dashboard onOpenProject={openProject} onNavigate={navigate} />;
      case 'projects':
        return <Projects onOpenProject={openProject} />;
      case 'library':
        return <KnowledgeLibrary />;
      case 'publications':
        return <Publications onNavigate={navigate} />;
      case 'journals':
        return <JournalFinder />;
      case 'reviews':
        return <ReviewQueue onOpenProject={openProject} />;
      case 'institution':
        return <InstitutionAdmin />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onOpenProject={openProject} onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>ResearchAtlas</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-item ${page === item.key && !selectedProjectId ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={signOut}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button className="menu-toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="app-header-title">
            {selectedProjectId ? (
              <button className="back-link" onClick={() => setSelectedProjectId(null)}>
                <X size={16} /> Close project
              </button>
            ) : (
              <h2>{currentNav.label}</h2>
            )}
          </div>
          <div className="app-header-actions">
            <button className="header-icon-btn" aria-label="Search"><Search size={18} /></button>
            <button className="header-icon-btn" aria-label="Notifications"><Bell size={18} /></button>
            <div className="header-profile">
              <div className="header-avatar">
                {(profile.full_name ?? profile.email)[0].toUpperCase()}
              </div>
              <div className="header-profile-info">
                <span className="header-name">{profile.full_name ?? 'Researcher'}</span>
                <span className="header-role">{profile.role}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="app-content">
          {renderPage()}
        </div>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
