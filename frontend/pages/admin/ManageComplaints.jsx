import { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t, CATEGORIES, STATUSES, STATUS_COLOR, PRIORITY_COLOR, catById } from '../../data/constants';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityChip from '../../components/ui/PriorityChip';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/helpers';
import './ManageComplaints.css';

export default function ManageComplaints() {
  const { lang, complaints, updateStatus, updatePriority } = useStore();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterPri,    setFilterPri]    = useState('');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null);
  const [statusNote,   setStatusNote]   = useState('');

  const hasFilter = filterStatus || filterCat || filterPri || search;

  const filtered = complaints.filter((c) => {
    if (filterStatus && c.status   !== filterStatus) return false;
    if (filterCat    && c.category !== filterCat)    return false;
    if (filterPri    && c.priority !== filterPri)    return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openModal  = (c) => { setSelected(c); setStatusNote(''); };
  const closeModal = () => setSelected(null);

  return (
    <div className="manage-page">
      <div>
        <p className="section-label">Admin Portal</p>
        <h1 className="page-title">{t('manage', lang)}</h1>
      </div>

      {/* ── Filter bar ── */}
      <div className="manage-filters">
        <div className="filter-input-wrap manage-search">
          <Search size={14} strokeWidth={2} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            className="filter-input"
            placeholder="Search by title or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search complaints"
          />
        </div>

        <select className="filter-select" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="filter-select" value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)} aria-label="Filter by category">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label[lang] || c.label.en}</option>)}
        </select>

        <select className="filter-select" value={filterPri}
          onChange={(e) => setFilterPri(e.target.value)} aria-label="Filter by priority">
          <option value="">All Priorities</option>
          {['Critical','High','Medium','Low'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {hasFilter && (
          <button className="btn btn-ghost btn-sm manage-clear"
            onClick={() => { setFilterStatus(''); setFilterCat(''); setFilterPri(''); setSearch(''); }}>
            <X size={13} strokeWidth={2.5} aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      <p className="manage-count">
        <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
        {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
        {hasFilter ? ' matching filters' : ' total'}
      </p>

      {/* ── Table ── */}
      <div className="manage-table-wrap">
        <table className="manage-table" aria-label="Complaints management table">
          <thead>
            <tr>
              <th>ID</th><th>Title</th><th>Category</th>
              <th>Status</th><th>Priority</th><th>Submitted</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const cat = catById(c.category);
              return (
                <tr key={c.id}>
                  <td className="td-mono">{c.id}</td>
                  <td className="td-title" title={c.title}>{c.title}</td>
                  <td>
                    <span className="td-cat" style={{ '--cat-color': cat.color }}>
                      {cat.label[lang] || cat.label.en}
                    </span>
                  </td>
                  <td>
                    <div className="inline-select-wrap" style={{ '--s-color': STATUS_COLOR[c.status] }}>
                      <select
                        className="inline-select"
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        aria-label={`Status for ${c.id}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={11} strokeWidth={2.5} className="inline-select-icon" aria-hidden="true" />
                    </div>
                  </td>
                  <td>
                    <div className="inline-select-wrap" style={{ '--s-color': PRIORITY_COLOR[c.priority] }}>
                      <select
                        className="inline-select"
                        value={c.priority}
                        onChange={(e) => updatePriority(c.id, e.target.value)}
                        aria-label={`Priority for ${c.id}`}
                      >
                        {['Critical','High','Medium','Low'].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown size={11} strokeWidth={2.5} className="inline-select-icon" aria-hidden="true" />
                    </div>
                  </td>
                  <td className="td-date">{formatDate(c.submittedAt, lang)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm detail-btn"
                      onClick={() => openModal(c)} aria-label={`View details for ${c.id}`}>
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state" style={{ borderTop: '1px solid var(--border-light)' }}>
            <Search size={36} strokeWidth={1.2} className="empty-state__icon" aria-hidden="true" />
            <p className="empty-state__title">No complaints match your filters</p>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <Modal open={!!selected} onClose={closeModal} title={selected.id}>
          <div className="detail-modal">
            <h3 className="detail-title">{selected.title}</h3>
            <p className="detail-desc">{selected.description}</p>

            <div className="detail-chips">
              <StatusBadge  status={selected.status} />
              <PriorityChip priority={selected.priority} />
              <span className="td-cat" style={{ '--cat-color': catById(selected.category).color }}>
                {catById(selected.category).label[lang]}
              </span>
            </div>

            {selected.photo && (
              <img src={selected.photo} alt="Evidence" className="detail-photo" />
            )}

            <div className="detail-field">
              <label className="form-label" htmlFor="modal-status">Update Status</label>
              <select id="modal-status" className="form-input"
                value={selected.status}
                onChange={(e) => {
                  updateStatus(selected.id, e.target.value, statusNote);
                  setSelected((p) => ({ ...p, status: e.target.value }));
                  setStatusNote('');
                }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="detail-field">
              <label className="form-label" htmlFor="modal-note">Note (optional)</label>
              <textarea id="modal-note" className="form-input" rows={2}
                placeholder="Add a note for this status change…"
                value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </div>

            <div className="detail-field">
              <p className="form-label" style={{ marginBottom: 8 }}>Timeline</p>
              <ol className="mini-tl">
                {[...selected.timeline].reverse().map((entry, i) => (
                  <li key={i} className="mini-tl__item">
                    <StatusBadge status={entry.status} />
                    <span className="mini-tl__note">{entry.note}</span>
                    <span className="mini-tl__date">{formatDate(entry.at, lang)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
