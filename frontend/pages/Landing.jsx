import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Layers,
  ArrowRight, MapPin, CheckCircle2, ClipboardList, Globe,
} from 'lucide-react';
import './Landing.css';

const ROLES = [
  {
    key:     'citizen',
    to:      '/login',
    icon:    User,
    color:   '#23845B',
    bg:      '#EDFAF4',
    border:  '#A7D9C0',
    title:   'Citizen',
    sub:     'Report & Track Issues',
    desc:    'Submit civic complaints, upload photos, pin locations and track resolution progress in real time.',
    bullets: [
      'Report potholes, garbage, water issues & more',
      'Upload photo evidence from camera or gallery',
      'Track real-time status updates with complaint ID',
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ── Header ── */}
      <header className="landing-header">
        <div className="landing-brand">
          <Building2 size={22} strokeWidth={1.8} className="landing-brand-icon" />
          <span className="landing-brand-name">CivicSense</span>
        </div>
        <span className="landing-brand-tag">
          <Globe size={12} strokeWidth={2} aria-hidden="true" />
          Smart Civic Reporting for Indian Municipal Corporations
        </span>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <p className="landing-eyebrow">
          <MapPin size={13} strokeWidth={2.5} />
          For Every Indian Municipality
        </p>
        <h1 className="landing-title">
          Your City. Your Voice.<br />
          <span className="landing-title-accent">Your Community.</span>
        </h1>
        <p className="landing-sub">
          CivicSense helps citizens report civic problems, enables municipal departments to
          manage and resolve them efficiently, and gives administrators complete oversight —
          all in one platform built for Indian municipalities.
        </p>
      </section>

      {/* ── Role cards ── */}
      <section className="landing-cards" aria-label="Citizen sign in">
        {ROLES.map(({ key, to, icon: Icon, color, bg, border, title, sub, desc, bullets, featured }) => (
          <div
            key={key}
            className={'role-card' + (featured ? ' role-card--featured' : '')}
            style={{ '--rc-color': color, '--rc-bg': bg, '--rc-border': border }}
          >
            {featured && <span className="role-card__badge">Full Access</span>}

            <div className="role-card__icon-wrap">
              <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
            </div>

            <h2 className="role-card__title">{title}</h2>
            <p className="role-card__sub">{sub}</p>
            <p className="role-card__desc">{desc}</p>

            <ul className="role-card__bullets">
              {bullets.map((b) => (
                <li key={b}>
                  <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>

            <button
              className="role-card__btn"
              onClick={() => navigate(to)}
              aria-label={`Sign in as ${title}`}
            >
              Sign in as {title}
              <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        ))}
      </section>

      {/* ── Stats strip ── */}
      <section className="landing-stats" aria-label="Platform statistics">
        {[
          { icon: ClipboardList, label: 'Issue Categories', value: '7'           },
          { icon: CheckCircle2,  label: 'Roles Supported',  value: '3'           },
          { icon: Layers,        label: 'Departments',      value: '7'           },
          { icon: Globe,         label: 'Platform',         value: 'India-wide'  },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="landing-stat">
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            <span className="landing-stat__val">{value}</span>
            <span className="landing-stat__label">{label}</span>
          </div>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} CivicSense · Smart Civic Reporting for Indian Municipal Corporations</span>
      </footer>
    </div>
  );
}
