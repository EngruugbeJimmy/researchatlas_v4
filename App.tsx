import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';
import { isSupabaseConfigured } from './supabase';

function AppContent() {
  const { session, profile, workspace, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

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
