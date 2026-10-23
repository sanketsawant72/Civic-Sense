import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Plus, FileText,
  ChevronRight, X, AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, CATEGORIES, STATUSES } from '../data/constants';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityChip from '../components/ui/PriorityChip';
import CategoryPill from '../components/ui/CategoryPill';
import { timeAgo, formatDate } from '../utils/helpers';
import './MyComplaints.css';

export default function MyComplaints() {
  const { lang, complaints } = useStore();
  const navigate = useNavigate();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [sortBy,       setSortBy]       = useState('newest');

  const hasFilter = search || filterStatus || filterCat;

  const filtered = complaints
    .filter((c) => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterCat   && c.category !== filterCat)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return b.submittedAt - a.submittedAt;
      if (sortBy === 'oldest')   return a.submittedAt - b.submittedAt;
      if (sortBy === 'priority') {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
      }
      return 0;
    });

  return (
    <div className="mc-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <p className="section-label">Civic Reports</p>
          <h1 className="page-title">{t('mine', lang)}</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/report')}>
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          {t('report', lang)}
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="mc-filters">
        <div className="filter-input-wrap mc-search">
          <Search size={14} strokeWidth={2} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            className="filter-input"
            placeholder="Search by title or complaint ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search complaints"
          />
        </div>

        <div className="mc-selects">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="filter-select"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label[lang] || c.label.en}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
          </select>

          {hasFilter && (
            <button
              className="btn btn-ghost btn-sm mc-clear"
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterCat(''); }}
              aria-label="Clear filters"
            >
              <X size={13} strokeWidth={2.5} aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ── */}
      <p className="mc-count">
        <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
        {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
        {hasFilter ? ' matching filters' : ' total'}
      </p>

      {/* ── List / empty ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={40} strokeWidth={1.2} className="empty-state__icon" aria-hidden="true" />
          <p className="empty-state__title">
            {hasFilter ? 'No complaints match your filters' : 'No complaints yet'}
          </p>
          <p className="empty-state__desc">
            {hasFilter
              ? 'Try adjusting your search or filters.'
              : 'File your first complaint and track it to resolution.'}
          </p>
          {!hasFilter && (
            <button className="btn btn-primary" onClick={() => navigate('/report')}>
              <Plus size={15} strokeWidth={2.5} /> Report an Issue
            </button>
          )}
        </div>
      ) : (
        <div className="mc-list">
          {filtered.map((c) => (
            <article key={c.id} className="mc-card">
              <div className="mc-card__top">
                <div className="mc-card__badges">
                  <CategoryPill categoryId={c.category} />
                  <PriorityChip priority={c.priority} />
                </div>
                <span className="mc-card__id">{c.id}</span>
              </div>

              <h2 className="mc-card__title">{c.title}</h2>
              <p className="mc-card__desc">{c.description}</p>

              <div className="mc-card__footer">
                <StatusBadge status={c.status} />
                <span className="mc-card__time" title={formatDate(c.submittedAt, lang)}>
                  {timeAgo(c.submittedAt)}
                </span>
                <button
                  className="btn btn-ghost btn-sm mc-card__track"
                  onClick={() => navigate(`/track?id=${c.id}`)}
                  aria-label={`Track complaint ${c.id}`}
                >
                  Track <ChevronRight size={13} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
