import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Clock, ClipboardList,
  MapPin, ArrowRight, Truck, Zap, Droplets,
  Lightbulb, HardHat, Trash2, HelpCircle,
  TrendingUp, ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, CATEGORIES } from '../data/constants';
import StatusBadge from '../components/ui/StatusBadge';
import CategoryPill from '../components/ui/CategoryPill';
import { timeAgo } from '../utils/helpers';
import './Home.css';

// Map category ids to Lucide icons
const CAT_ICONS = {
  pothole:      Truck,
  garbage:      Trash2,
  drainage:     Droplets,
  water:        Droplets,
  streetlight:  Lightbulb,
  construction: HardHat,
  other:        HelpCircle,
};

export default function Home() {
  const { lang, complaints } = useStore();
  const navigate = useNavigate();

  const total      = complaints.length;
  const resolved   = complaints.filter((c) => c.status === 'Resolved').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length;
  const submitted  = complaints.filter((c) => c.status === 'Submitted').length;
  const resRate    = total ? Math.round((resolved / total) * 100) : 0;

  const recent = complaints.slice(0, 5);

  return (
    <div className="home">

      {/* ── Hero ── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-left">
          <p className="hero-eyebrow">
            <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
            Civic Reporting Platform
          </p>
          <h1 id="hero-heading" className="hero-heading">
            Make Your City Better,<br />
            <span className="hero-heading-accent">One Report at a Time.</span>
          </h1>
          <p className="hero-sub">
            Report civic problems in your municipality, track their progress,
            and help build a cleaner, safer city for everyone.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/report')}>
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
              Report an Issue
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/map')}>
              <MapPin size={16} strokeWidth={2} aria-hidden="true" />
              Community Map
            </button>
          </div>
        </div>

        <div className="hero-right" aria-hidden="true">
          <div className="hero-visual">
            <div className="hv-map-bg">
              <div className="hv-grid" />
              {/* Decorative issue pins */}
              <div className="hv-pin hv-pin--road"   style={{ top: '28%', left: '35%' }}>
                <Truck size={13} strokeWidth={2} />
              </div>
              <div className="hv-pin hv-pin--water"  style={{ top: '52%', left: '55%' }}>
                <Droplets size={13} strokeWidth={2} />
              </div>
              <div className="hv-pin hv-pin--light"  style={{ top: '38%', left: '68%' }}>
                <Lightbulb size={13} strokeWidth={2} />
              </div>
              <div className="hv-pin hv-pin--waste"  style={{ top: '65%', left: '30%' }}>
                <Trash2 size={13} strokeWidth={2} />
              </div>
              <div className="hv-pin hv-pin--drain"  style={{ top: '20%', left: '60%' }}>
                <Droplets size={13} strokeWidth={2} />
              </div>
            </div>
            <div className="hv-card hv-card--1">
              <CheckCircle2 size={14} strokeWidth={2.5} className="hv-card-icon hv-card-icon--green" />
              <div>
                <div className="hv-card-title">Issue Resolved</div>
                <div className="hv-card-sub">Water pipe on MG Road</div>
              </div>
            </div>
            <div className="hv-card hv-card--2">
              <Clock size={14} strokeWidth={2.5} className="hv-card-icon hv-card-icon--amber" />
              <div>
                <div className="hv-card-title">In Progress</div>
                <div className="hv-card-sub">Pothole repair team dispatched</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="stats-strip" aria-label="Platform statistics">
        <div className="stat-item">
          <span className="stat-item__icon stat-item__icon--navy">
            <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <span className="stat-item__num">{total}</span>
            <span className="stat-item__label">Total Reports</span>
          </div>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="stat-item">
          <span className="stat-item__icon stat-item__icon--green">
            <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <span className="stat-item__num">{resolved}</span>
            <span className="stat-item__label">Resolved</span>
          </div>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="stat-item">
          <span className="stat-item__icon stat-item__icon--amber">
            <Clock size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <span className="stat-item__num">{inProgress}</span>
            <span className="stat-item__label">In Progress</span>
          </div>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="stat-item">
          <span className="stat-item__icon stat-item__icon--teal">
            <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <span className="stat-item__num">{submitted}</span>
            <span className="stat-item__label">Newly Submitted</span>
          </div>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="stat-item">
          <span className="stat-item__icon stat-item__icon--navy">
            <TrendingUp size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <span className="stat-item__num">{resRate}%</span>
            <span className="stat-item__label">Resolution Rate</span>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="home-section" aria-labelledby="cat-heading">
        <div className="section-header-row">
          <div>
            <p className="section-label">Report by Issue Type</p>
            <h2 id="cat-heading">Select a Category</h2>
          </div>
          <button className="btn btn-ghost btn-sm text-link" onClick={() => navigate('/report')}>
            All categories <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="cat-grid">
          {CATEGORIES.filter((c) => c.id !== 'other').map((cat) => {
            const Icon = CAT_ICONS[cat.id] || HelpCircle;
            return (
              <button
                key={cat.id}
                className="cat-card"
                style={{ '--cat-color': cat.color }}
                onClick={() => navigate(`/report?cat=${cat.id}`)}
                aria-label={`Report ${cat.label[lang] || cat.label.en}`}
              >
                <span className="cat-card__icon-wrap" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="cat-card__label">{cat.label[lang] || cat.label.en}</span>
                <span className="cat-card__dept">{cat.dept}</span>
                <ChevronRight size={14} strokeWidth={2} className="cat-card__arrow" aria-hidden="true" />
              </button>
            );
          })}
          {/* Other */}
          <button
            className="cat-card cat-card--other"
            onClick={() => navigate('/report')}
            aria-label="Report Other civic issue"
          >
            <span className="cat-card__icon-wrap" aria-hidden="true">
              <HelpCircle size={20} strokeWidth={1.8} />
            </span>
            <span className="cat-card__label">Other Issue</span>
            <span className="cat-card__dept">General Administration</span>
            <ChevronRight size={14} strokeWidth={2} className="cat-card__arrow" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ── Recent complaints ── */}
      {recent.length > 0 && (
        <section className="home-section" aria-labelledby="recent-heading">
          <div className="section-header-row">
            <div>
              <p className="section-label">Community Activity</p>
              <h2 id="recent-heading">Recent Reports</h2>
            </div>
            <button className="btn btn-ghost btn-sm text-link" onClick={() => navigate('/my-complaints')}>
              View all <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <div className="recent-list" role="list">
            {recent.map((c) => (
              <article key={c.id} className="recent-item" role="listitem">
                <div className="recent-item__left">
                  <CategoryPill categoryId={c.category} />
                  <h3 className="recent-item__title">{c.title}</h3>
                  <div className="recent-item__meta">
                    <span className="recent-item__id">{c.id}</span>
                    <span className="recent-item__dot" aria-hidden="true" />
                    <span className="recent-item__time">{timeAgo(c.submittedAt)}</span>
                  </div>
                </div>
                <div className="recent-item__right">
                  <StatusBadge status={c.status} />
                  <button
                    className="btn btn-ghost btn-sm recent-item__track"
                    onClick={() => navigate(`/track?id=${c.id}`)}
                    aria-label={`Track complaint ${c.id}`}
                  >
                    Track <ChevronRight size={13} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="home-section how-it-works" aria-labelledby="how-heading">
        <div className="section-header-row">
          <div>
            <p className="section-label">Quick Guide</p>
            <h2 id="how-heading">How CivicSense Works</h2>
          </div>
        </div>
        <div className="how-grid">
          {[
            { icon: AlertCircle, step: '01', title: 'Report an Issue', desc: 'Choose a category, describe the problem, add a photo and pin the location.' },
            { icon: ClipboardList, step: '02', title: 'Gets Reviewed', desc: 'The municipal team reviews your report and assigns it to the right department.' },
            { icon: Zap, step: '03', title: 'Action Taken', desc: 'Field teams are dispatched and the issue is resolved on the ground.' },
            { icon: CheckCircle2, step: '04', title: 'Track & Confirm', desc: 'Follow progress with your complaint ID and confirm when resolved.' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="how-card">
              <span className="how-card__step">{step}</span>
              <span className="how-card__icon-wrap" aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <h3 className="how-card__title">{title}</h3>
              <p className="how-card__desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
