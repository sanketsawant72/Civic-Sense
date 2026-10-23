import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Mail, Lock, User, Phone,
  Eye, EyeOff, AlertCircle, UserPlus,
} from 'lucide-react';
import { useAuthStore }  from '../store/useAuthStore';
import { useStore }      from '../store/useStore';
import { registerApi }   from '../utils/api.js';
import './Login.css';   // reuse auth styles

export default function Register() {
  const navigate      = useNavigate();
  const setAuth       = useAuthStore((s) => s.setAuth);
  const loadComplaints = useStore((s) => s.loadComplaints);

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Name, email and password are required.'); return; }
    if (password.length < 6)          { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)          { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { token, user } = await registerApi(name.trim(), email.trim(), password, phone.trim());
      setAuth({ token, user });
      await loadComplaints();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Building2 size={28} strokeWidth={1.8} className="auth-brand-icon" aria-hidden="true" />
          <span className="auth-brand-name">CivicSense</span>
        </div>
        <h1 className="auth-title">Create a citizen account</h1>
        <p className="auth-sub">Report and track civic issues in Ashta, Maharashtra</p>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={14} strokeWidth={2} aria-hidden="true" /> {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Full name */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full Name <span className="required">*</span></label>
            <div className="input-icon-wrap">
              <User size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input id="reg-name" type="text" className="form-input input-with-icon"
                placeholder="Ramesh Patil" value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" required />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address <span className="required">*</span></label>
            <div className="input-icon-wrap">
              <Mail size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input id="reg-email" type="email" className="form-input input-with-icon"
                placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required />
            </div>
          </div>

          {/* Phone (optional) */}
          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label">Phone <span className="form-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
            <div className="input-icon-wrap">
              <Phone size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input id="reg-phone" type="tel" className="form-input input-with-icon"
                placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel" />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password <span className="required">*</span></label>
            <div className="input-icon-wrap">
              <Lock size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input id="reg-password" type={showPwd ? 'text' : 'password'}
                className="form-input input-with-icon input-with-icon-right"
                placeholder="Min 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}>
                {showPwd ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Confirm Password <span className="required">*</span></label>
            <div className="input-icon-wrap">
              <Lock size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input id="reg-confirm" type={showPwd ? 'text' : 'password'}
                className="form-input input-with-icon"
                placeholder="Re-enter password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading
              ? <span className="auth-spinner" aria-hidden="true" />
              : <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
            }
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
