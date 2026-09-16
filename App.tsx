import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';

function AppContent() {
  const { session, profile, workspace, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

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
    if (showAuth) {
      return <AuthScreen mode={authMode} />;
    }
    return (
      <LandingPage
        onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
        onSignIn={() => { setAuthMode('signin'); setShowAuth(true); }}
      />
    );
  }

  if (!profile || !workspace) {
    return <Onboarding />;
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
