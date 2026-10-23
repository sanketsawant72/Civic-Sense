import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, Home, AlertCircle, FileText, Map, Search,
  ChevronDown, User, ShieldCheck, Layers, LogOut,
  Menu, X, Users,
} from 'lucide-react';
import { useStore }     from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { logoutApi }    from '../../utils/api.js';
import { t }            from '../../data/constants';
import './Navbar.css';

// ── Nav link sets per role ────────────────────────────────────────────────────
const CITIZEN_LINKS = [
  { key: 'home',   to: '/',               icon: Home },
  { key: 'report', to: '/report',          icon: AlertCircle },
  { key: 'mine',   to: '/my-complaints',   icon: FileText },
  { key: 'cmap',   to: '/map',             icon: Map },
  { key: 'track',  to: '/track',           icon: Search },
];

const ADMIN_LINKS = [
  { key: 'dash',        to: '/admin',               icon: Home,      label: 'Dashboard' },
  { key: 'manage',      to: '/admin/manage',         icon: FileText,  label: 'Complaints' },
  { key: 'amap',        to: '/admin/map',            icon: Map,       label: 'Map' },
  { key: 'departments', to: '/admin/departments',    icon: Users,     label: 'Departments' },
];

const LANG_LABELS = { en: 'EN', hi: 'हि', mr: 'म' };
const LANG_NAMES  = { en: 'English', hi: 'हिन्दी', mr: 'मराठी' };

export default function Navbar() {
  const { lang, setLang }           = useStore();
  const { user, clearAuth }         = useAuthStore();
  const navigate                    = useNavigate();

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [langOpen,    setLangOpen]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role  = user?.role || 'citizen';
  const deptPath = `/department/${encodeURIComponent(user?.departmentCategory || '')}`;
  const links = role === 'admin'
    ? ADMIN_LINKS
    : role === 'department'
      ? [
          { key: 'dept-dash', to: deptPath, icon: Home, label: 'Dashboard' },
          { key: 'dept-complaints', to: `${deptPath}/complaints`, icon: FileText, label: 'Complaints' },
        ]
      : CITIZEN_LINKS;

  async function handleLogout() {
    try { await logoutApi(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login', { replace: true });
  }

  const avatarInitial = user?.name?.[0]?.toUpperCase() || '?';

  const RoleBadge = () => {
    if (role === 'admin')      return <span className="role-badge role-badge--admin"><ShieldCheck size={11} /> Admin</span>;
    if (role === 'department') return <span className="role-badge role-badge--dept"><Layers size={11} /> {user?.departmentName?.split(' ')[0]}</span>;
    return <span className="role-badge role-badge--citizen"><User size={11} /> Citizen</span>;
  };

  return (
    <header className="navbar" role="banner">

      {/* ── Brand ── */}
      <div className="navbar-brand">
        <Building2 size={20} strokeWidth={1.8} className="navbar-brand-icon" aria-hidden="true" />
        <span className="navbar-wordmark">CivicSense</span>
        <span className="navbar-descriptor">Smart Civic Reporting</span>
      </div>

      {/* ── Center nav (desktop) ── */}
      <nav className="navbar-nav" aria-label="Main navigation">
        {links.map(({ key, to, icon: Icon, label }) => (
          <NavLink
            key={key}
            to={to}
            end={key === 'home' || key === 'dash' || key === 'dept-dash'}
            className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')}
          >
            <Icon size={14} strokeWidth={2} aria-hidden="true" />
            {label || t(key, lang)}
          </NavLink>
        ))}
      </nav>

      {/* ── Right controls ── */}
      <div className="navbar-controls">

        {/* Language dropdown */}
        <div className="lang-dropdown" onBlur={() => setLangOpen(false)}>
          <button
            className="lang-trigger btn btn-ghost btn-sm"
            onClick={() => setLangOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            aria-label="Language"
          >
            <span className="lang-current">{LANG_LABELS[lang]}</span>
            <ChevronDown size={12} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {langOpen && (
            <ul className="lang-menu" role="listbox" aria-label="Select language">
              {Object.entries(LANG_LABELS).map(([code, label]) => (
                <li
                  key={code}
                  role="option"
                  aria-selected={lang === code}
                  className={'lang-option' + (lang === code ? ' lang-option--active' : '')}
                  onMouseDown={() => { setLang(code); setLangOpen(false); }}
                >
                  {label}
                  <span className="lang-name">{LANG_NAMES[code]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* User menu */}
        {user ? (
          <div className="user-menu-wrap" onBlur={() => setUserMenuOpen(false)}>
            <button
              className="user-trigger"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <span className="user-avatar" aria-hidden="true">{avatarInitial}</span>
              <span className="user-name">{user.name.split(' ')[0]}</span>
              <RoleBadge />
              <ChevronDown size={12} strokeWidth={2.5} aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div className="user-menu" role="menu">
                {/* Identity header */}
                <div className="user-menu__header">
                  <span className="user-menu__avatar">{avatarInitial}</span>
                  <div>
                    <p className="user-menu__name">{user.name}</p>
                    <p className="user-menu__email">{user.email}</p>
                  </div>
                </div>
                <div className="user-menu__divider" aria-hidden="true" />

                {/* Role-specific quick links */}
                {role === 'admin' && (
                  <button className="user-menu__item" role="menuitem"
                    onMouseDown={() => { navigate('/admin/departments'); setUserMenuOpen(false); }}>
                    <Users size={14} strokeWidth={2} /> Manage Departments
                  </button>
                )}
                {role === 'department' && (
                  <div className="user-menu__dept-info">
                    <Layers size={12} strokeWidth={2} />
                    {user.departmentName}
                  </div>
                )}

                <div className="user-menu__divider" aria-hidden="true" />
                <button
                  className="user-menu__item user-menu__item--danger"
                  role="menuitem"
                  onMouseDown={handleLogout}
                >
                  <LogOut size={14} strokeWidth={2} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
            Sign In
          </button>
        )}

        {/* Mobile hamburger */}
        <button
          className="menu-btn btn btn-ghost btn-sm"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen
            ? <X    size={18} strokeWidth={2} aria-hidden="true" />
            : <Menu size={18} strokeWidth={2} aria-hidden="true" />
          }
        </button>
      </div>

      {/* ── Mobile nav ── */}
      {menuOpen && (
        <div className="mobile-nav" aria-label="Mobile navigation">
          {links.map(({ key, to, icon: Icon, label }) => (
            <NavLink
              key={key}
              to={to}
              end={key === 'home' || key === 'dash' || key === 'dept-dash'}
              className={({ isActive }) =>
                'mobile-nav-link' + (isActive ? ' mobile-nav-link--active' : '')
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {label || t(key, lang)}
            </NavLink>
          ))}
          <div className="mobile-nav-divider" aria-hidden="true" />
          <button className="mobile-nav-link mobile-nav-link--danger" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2} /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
