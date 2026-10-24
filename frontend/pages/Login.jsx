import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Mail, Lock, Eye, EyeOff, AlertCircle,
  LogIn, User, ShieldCheck, Layers, ArrowLeft,
} from 'lucide-react';
import { useAuthStore }  from '../store/useAuthStore';
import { useStore }      from '../store/useStore';
import { loginApi }      from '../utils/api.js';
import './Login.css';

const ROLE_META = {
  citizen: {
    icon:    User,
    color:   '#23845B',
    label:   'Citizen Portal',
    sub:     'Report & track civic issues',
    hint:    'Enter your registered email',
    pwdHint: 'Your account password',
  },
  admin: {
    icon:    ShieldCheck,
    color:   '#173B63',
    label:   'Admin Portal',
    sub:     'Manage all complaints & departments',
    hint:    'Admin account email',
    pwdHint: 'Admin password',
  },
  department: {
    icon:    Layers,
    color:   '#167D83',
    label:   'Department Portal',
    sub:     'Manage your department queue',
    hint:    'Department account email',
    pwdHint: 'Department password',
  },
};

export default function Login({ role = 'citizen' }) {
  const navigate       = useNavigate();
  const setAuth        = useAuthStore((s) => s.setAuth);
  const loadComplaints = useStore((s) => s.loadComplaints);

  const selectedRole = ROLE_META[role] ? role : 'citizen';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const meta = ROLE_META[selectedRole];
  const Icon = meta.icon;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);

    try {
      const { token, user } = await loginApi(email.trim(), password);

      if (user.role !== selectedRole) {
        const portalName = ROLE_META[selectedRole].label.replace(' Portal', '');
        throw new Error(`This account cannot sign in through the ${portalName} portal.`);
      }

      setAuth({ token, user });

      // Load complaints scoped to the actual role
      await loadComplaints().catch(() => {}); // non-fatal

      if (user.role === 'admin')           navigate('/admin',      { replace: true });
      else if (user.role === 'department') navigate('/department', { replace: true });
      else                                 navigate('/home',        { replace: true });

    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ '--portal-color': meta.color }}>

        {/* ── Back ── */}
        <button className="auth-back" onClick={() => navigate('/landing')} aria-label="Back to home">
          <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" /> Back
        </button>

        {/* ── Brand ── */}
        <div className="auth-brand">
          <Building2 size={26} strokeWidth={1.8} className="auth-brand-icon" aria-hidden="true" />
          <span className="auth-brand-name">CivicSense</span>
        </div>

        {/* ── Portal heading ── */}
        <div className="auth-portal-head">
          <span className="auth-portal-icon" style={{ background: meta.color + '18', color: meta.color }}>
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h1 className="auth-title">{meta.label}</h1>
            <p className="auth-hint-email">{meta.sub}</p>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="auth-error" role="alert" aria-live="assertive">
            <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email address</label>
            <div className="input-icon-wrap">
              <Mail size={15} strokeWidth={2} className="input-icon" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                className="form-input input-with-icon"
                placeholder={meta.hint}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoFocus
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
                placeholder={meta.pwdHint}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            style={{ background: meta.color, borderColor: meta.color }}
            disabled={loading}
          >
            {loading
              ? <span className="auth-spinner" aria-hidden="true" />
              : <LogIn size={16} strokeWidth={2} aria-hidden="true" />
            }
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {import.meta.env.DEV && (selectedRole === 'admin' || selectedRole === 'department') && (
          <div className="demo-creds">
            <p className="demo-creds__label">Local development login</p>
            {selectedRole === 'admin' && (
              <div className="demo-creds__row">
                <span>admin@civicsense.in</span>
                <span className="demo-creds__pwd">Admin@1234</span>
              </div>
            )}
            {selectedRole === 'department' && (
              <div className="demo-creds__rows">
                <div className="demo-creds__row"><span>pwd@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>sanitation@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>drainage@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>water@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>electrical@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>planning@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
                <div className="demo-creds__row"><span>general@civicsense.in</span><span className="demo-creds__pwd">Dept@1234</span></div>
              </div>
            )}
          </div>
        )}

        {selectedRole === 'citizen' && (
          <p className="auth-footer-text">
            No account?{' '}
            <Link to="/register" className="auth-link">Create one free</Link>
          </p>
        )}
      </div>
    </div>
  );
}
