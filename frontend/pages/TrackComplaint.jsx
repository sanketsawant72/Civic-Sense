import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Calendar, Building2, CheckCircle2,
  Clock, AlertCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, STATUSES, STATUS_COLOR, catById } from '../data/constants';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityChip from '../components/ui/PriorityChip';
import CategoryPill from '../components/ui/CategoryPill';
import { formatDate } from '../utils/helpers';
import './TrackComplaint.css';

// Map statuses to icons
const STATUS_ICONS = {
  'Submitted':    AlertCircle,
  'Under Review': Clock,
  'Assigned':     Building2,
  'In Progress':  Clock,
  'Resolved':     CheckCircle2,
  'Rejected':     XCircle,
};

const ACTIVE_STATUSES = STATUSES.filter((s) => s !== 'Rejected');

export default function TrackComplaint() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { lang, complaints } = useStore();

  const [query,    setQuery]    = useState(params.get('id') || '');
  const [result,   setResult]   = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = params.get('id');
    if (id) {
      const found = complaints.find((c) => c.id === id);
      setResult(found || null);
      setNotFound(!found);
      setQuery(id);
    }
  }, [params, complaints]);

  function handleSearch(e) {
    e.preventDefault();
    const id = query.trim().toUpperCase();
    const found = complaints.find((c) => c.id === id || c.id === query.trim());
    setResult(found || null);
    setNotFound(!found);
  }

  const cat          = result ? catById(result.category) : null;
  const currentIdx   = result ? ACTIVE_STATUSES.indexOf(result.status) : -1;
  const isRejected   = result?.status === 'Rejected';

  return (
    <div className="track-page">
      {/* ── Header ── */}
      <div>
        <p className="section-label">Complaint Status</p>
        <h1 className="page-title">{t('track', lang)}</h1>
      </div>

      {/* ── Search bar ── */}
      <form className="track-search" onSubmit={handleSearch} role="search">
        <div className="filter-input-wrap track-search__input-wrap">
          <Search size={15} strokeWidth={2} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="filter-input track-search__input"
            placeholder="Enter Complaint ID, e.g. CS-A3F9K2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Complaint ID"
            spellCheck={false}
            autoCapitalize="characters"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          <Search size={14} strokeWidth={2} aria-hidden="true" /> Track
        </button>
      </form>

      {/* ── Not found ── */}
      {notFound && (
        <div className="track-not-found" role="alert">
          <AlertCircle size={20} strokeWidth={1.8} className="not-found__icon" aria-hidden="true" />
          <p className="not-found__title">Complaint not found</p>
          <p className="not-found__desc">
            No record found for <code>{query}</code>. Please check the ID and try again.
          </p>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="track-result">

          {/* Summary card */}
          <div className="track-summary">
            <div className="track-summary__header">
              <div className="track-summary__meta-row">
                <code className="track-id">{result.id}</code>
                <div className="track-chips">
                  <CategoryPill categoryId={result.category} />
                  <PriorityChip priority={result.priority} />
                </div>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <h2 className="track-summary__title">{result.title}</h2>
            <p className="track-summary__desc">{result.description}</p>

            <div className="track-summary__details">
              <div className="track-detail">
                <Building2 size={13} strokeWidth={2} aria-hidden="true" />
                <span>{cat?.dept || 'General Administration'}</span>
              </div>
              <div className="track-detail">
                <Calendar size={13} strokeWidth={2} aria-hidden="true" />
                <span>Submitted {formatDate(result.submittedAt, lang)}</span>
              </div>
              <div className="track-detail">
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                <span>{result.lat.toFixed(4)}, {result.lng.toFixed(4)}</span>
              </div>
            </div>

            {result.photo && (
              <img src={result.photo} alt="Complaint evidence" className="track-photo" />
            )}
          </div>

          {/* Progress stepper */}
          {!isRejected && (
            <div className="track-stepper-section">
              <h3 className="track-section-title">Progress</h3>
              <div className="progress-stepper" role="list" aria-label="Complaint progress">
                {ACTIVE_STATUSES.map((s, i) => {
                  const done   = currentIdx >= i;
                  const active = result.status === s;
                  const Icon   = STATUS_ICONS[s] || Clock;
                  return (
                    <div
                      key={s}
                      className={'ps-step' + (done ? ' ps-step--done' : '') + (active ? ' ps-step--active' : '')}
                      role="listitem"
                      aria-current={active ? 'step' : undefined}
                    >
                      {i > 0 && (
                        <div className={'ps-connector' + (done && currentIdx > i - 1 ? ' ps-connector--done' : '')} aria-hidden="true" />
                      )}
                      <div className="ps-step__circle" aria-hidden="true">
                        <Icon size={13} strokeWidth={2.5} />
                      </div>
                      <span className="ps-step__label">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isRejected && (
            <div className="track-rejected">
              <XCircle size={18} strokeWidth={2} aria-hidden="true" />
              <div>
                <p className="track-rejected__title">Complaint Rejected</p>
                <p className="track-rejected__desc">
                  {result.timeline.at(-1)?.note || 'This complaint was rejected by the review team.'}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="track-timeline-section">
            <h3 className="track-section-title">Activity Timeline</h3>
            <ol className="tl-list" aria-label="Complaint activity timeline">
              {[...result.timeline].reverse().map((entry, i) => {
                const Icon = STATUS_ICONS[entry.status] || Clock;
                return (
                  <li key={i} className="tl-item">
                    <div className="tl-item__left">
                      <div
                        className="tl-dot"
                        style={{ background: STATUS_COLOR[entry.status] || '#64748B' }}
                        aria-hidden="true"
                      >
                        <Icon size={10} strokeWidth={2.5} />
                      </div>
                      {i < result.timeline.length - 1 && (
                        <div className="tl-line" aria-hidden="true" />
                      )}
                    </div>
                    <div className="tl-item__content">
                      <div className="tl-item__header">
                        <StatusBadge status={entry.status} />
                        <span className="tl-date">{formatDate(entry.at, lang)}</span>
                      </div>
                      {entry.note && <p className="tl-note">{entry.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* CTA */}
          <div className="track-cta">
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/my-complaints')}>
              ← All Complaints
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>
              Report Another Issue <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
