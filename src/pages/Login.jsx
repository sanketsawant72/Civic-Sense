import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { getUserHomePath, useAuthStore } from '../store/useAuthStore';
import { useStore }     from '../store/useStore';
import { loginApi }     from '../utils/api.js';
import './Login.css';

export default function Login() {
  const navigate   = useNavigate();
  const setAuth    = useAuthStore((s) => s.setAuth);
  const loadComplaints = useStore((s) => s.loadComplaints);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const { token, user } = await loginApi(email.trim(), password);
      setAuth({ token, user });
      // Load complaints scoped to the role automatically
      await loadComplaints();
      navigate(getUserHomePath(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <Building2 size={28} strokeWidth={1.8} className="auth-brand-icon" aria-hidden="true" />
          <span className="auth-brand-name">CivicSense</span>
        </div>
        <h1 className="auth-title">Sign in to your account</h1>
        <p className="auth-sub">Smart Civic Reporting · Ashta, Maharashtra</p>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email address</label>
            <div className="input-icon-wrap">
              <Mail size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                className="form-input input-with-icon"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                className="form-input input-with-icon input-with-icon-right"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd
                  ? <EyeOff size={15} strokeWidth={2} aria-hidden="true" />
                  : <Eye    size={15} strokeWidth={2} aria-hidden="true" />
                }
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading
              ? <span className="auth-spinner" aria-hidden="true" />
              : <LogIn size={16} strokeWidth={2} aria-hidden="true" />
            }
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>

        {/* Hint cards */}
        <div className="auth-hints">
          <div className="hint-card hint-card--admin">
            <span className="hint-card__role">Admin</span>
            <span className="hint-card__email">admin@civicsense.in</span>
          </div>
          <div className="hint-card hint-card--dept">
            <span className="hint-card__role">Department</span>
            <span className="hint-card__email">Use your department account</span>
          </div>
          <div className="hint-card hint-card--citizen">
            <span className="hint-card__role">Citizen</span>
            <span className="hint-card__email">Register below</span>
          </div>
        </div>
      </div>
    </div>
  );
}
