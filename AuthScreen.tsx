import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ArrowRight, BookOpen, Users } from 'lucide-react';

export default function AuthScreen({ mode: initialMode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>ResearchAtlas</span>
        </div>
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'signin'
            ? 'Sign in to your research workspace.'
            : 'Start managing your research lifecycle today.'}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@university.edu"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="button button-solid auth-submit" disabled={submitting}>
            {submitting ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')} <ArrowRight size={15} />
          </button>
        </form>
        <p className="auth-toggle">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <div className="auth-features">
          <div><BookOpen size={16} /> Full research workflow</div>
          <div><Users size={16} /> Personal and institutional modes</div>
        </div>
      </div>
    </div>
  );
}
