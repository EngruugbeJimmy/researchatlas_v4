import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';
import { isSupabaseConfigured } from './supabase';

function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await signOut();
    setMessage('Password updated successfully. Please sign in with your new password.');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>ResearchAtlas</span>
        </div>
        <h1>Set a new password</h1>
        <p className="auth-subtitle">Choose a new password and sign in again.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Re-enter your password"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success" style={{ color: '#34d399', marginTop: '0.75rem', marginBottom: '0.5rem' }}>{message}</p>}

          <button type="submit" className="button button-solid auth-submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, profile, workspace, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');

  useEffect(() => {
    const syncPath = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  const isPasswordResetRoute = currentPath === '/reset-password' || new URLSearchParams(window.location.search).get('type') === 'recovery';

  if (isPasswordResetRoute) {
    return <ResetPasswordScreen />;
  }

  if (!isSupabaseConfigured) {
    if (showAuth) {
      return (
        <div className="auth-screen">
          <div className="auth-card">
            <div className="auth-brand">
              <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
              <span>ResearchAtlas</span>
            </div>
            <h1>Setup required</h1>
            <p className="auth-subtitle">
              Add valid Supabase environment variables to enable account creation.
            </p>
            <p className="auth-error">Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.</p>
            <button
              type="button"
              className="button button-solid auth-submit"
              onClick={() => { setShowAuth(false); }}
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return (
      <LandingPage
        onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
        onSignIn={() => { setAuthMode('signin'); setShowAuth(true); }}
      />
    );
  }

  if (showAuth) {
    return <AuthScreen mode={authMode} />;
  }

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-brand">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>ResearchAtlas</span>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LandingPage
        onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
        onSignIn={() => { setAuthMode('signin'); setShowAuth(true); }}
      />
    );
  }

  if (session && (!profile || !workspace)) {
    return (
      <LandingPage
        onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
        onSignIn={() => { setAuthMode('signin'); setShowAuth(true); }}
      />
    );
  }

  return <AppShell />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
