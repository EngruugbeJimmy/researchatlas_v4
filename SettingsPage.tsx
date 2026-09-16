import { useAuth } from '@/lib/auth';
import { User, Mail, Building2, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { profile, workspace, signOut } = useAuth();

  if (!profile || !workspace) return null;

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Manage your account and workspace preferences.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3><User size={18} /> Profile</h3>
          <div className="settings-row">
            <span>Name</span>
            <strong>{profile.full_name ?? 'Not set'}</strong>
          </div>
          <div className="settings-row">
            <span>Email</span>
            <strong>{profile.email}</strong>
          </div>
          <div className="settings-row">
            <span>Role</span>
            <strong>{profile.role}</strong>
          </div>
        </div>

        <div className="settings-card">
          <h3><Building2 size={18} /> Workspace</h3>
          <div className="settings-row">
            <span>Type</span>
            <strong>{workspace.type === 'personal' ? 'Personal' : 'Institution'}</strong>
          </div>
          {workspace.type === 'institution' && (
            <div className="settings-row">
              <span>Institution ID</span>
              <strong className="mono">{workspace.institution_id?.slice(0, 8) ?? 'N/A'}...</strong>
            </div>
          )}
        </div>

        <div className="settings-card">
          <h3><Shield size={18} /> Security</h3>
          <p className="settings-hint">Your data is protected by workspace-level row-level security policies.</p>
          <button className="button button-outline" onClick={signOut}>
            Sign out
          </button>
        </div>

        <div className="settings-card">
          <h3><Mail size={18} /> Notifications</h3>
          <p className="settings-hint">You receive notifications for review requests, comments, and publication opportunities.</p>
        </div>
      </div>
    </div>
  );
}
