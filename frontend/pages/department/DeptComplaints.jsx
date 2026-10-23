import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useStore }    from '../../store/useStore';
import { STATUSES, STATUS_COLOR, PRIORITY_COLOR } from '../../data/constants';
import StatusBadge  from '../../components/ui/StatusBadge';
import PriorityChip from '../../components/ui/PriorityChip';
import Modal        from '../../components/ui/Modal';
import { formatDate } from '../../utils/helpers';
import './DeptComplaints.css';

export default function DeptComplaints() {
  const { complaints, loadComplaints, updateStatus, updatePriority } = useStore();
  const navigate = useNavigate();

  const [search,   setSearch]   = useState('');
  const [fStatus,  setFStatus]  = useState('');
  const [fPri,     setFPri]     = useState('');
  const [selected, setSelected] = useState(null);
  const [note,     setNote]     = useState('');

  useEffect(() => { loadComplaints(); }, []); // eslint-disable-line

  const filtered = complaints.filter((c) => {
    if (fStatus && c.status   !== fStatus) return false;
    if (fPri    && c.priority !== fPri)    return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="dept-complaints">
      <div className="page-header">
        <div>
          <p className="section-label">Department Queue</p>
          <h1 className="page-title">All Complaints</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="dept-filters">
        <div className="filter-input-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} strokeWidth={2} className="search-icon" aria-hidden="true" />
          <input type="search" className="filter-input" placeholder="Search by title or ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={fPri} onChange={(e) => setFPri(e.target.value)}>
          <option value="">All Priorities</option>
          {['Critical','High','Medium','Low'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <p className="dept-count">
        <SlidersHorizontal size={13} strokeWidth={2} /> {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="dept-table-wrap">
        <table className="dept-table">
          <thead>
            <tr><th>ID</th><th>Title</th><th>Status</th><th>Priority</th><th>Submitted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="td-mono">{c.id}</td>
                <td className="td-title" title={c.title}>{c.title}</td>
                <td>
                  <div className="inline-sw" style={{ '--s-color': STATUS_COLOR[c.status] }}>
                    <select className="inline-select" value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={11} strokeWidth={2.5} className="inline-sw-icon" />
                  </div>
                </td>
                <td>
                  <div className="inline-sw" style={{ '--s-color': PRIORITY_COLOR[c.priority] }}>
                    <select className="inline-select" value={c.priority}
                      onChange={(e) => updatePriority(c.id, e.target.value)}>
                      {['Critical','High','Medium','Low'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={11} strokeWidth={2.5} className="inline-sw-icon" />
                  </div>
                </td>
                <td className="td-date">{formatDate(c.submittedAt)}</td>
                <td>
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setSelected(c); setNote(''); }}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p className="empty-state__title">No complaints found</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.id}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{selected.title}</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{selected.description}</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <StatusBadge status={selected.status} />
              <PriorityChip priority={selected.priority} />
            </div>
            {selected.photo && (
              <img src={selected.photo} alt="Evidence" style={{ maxHeight: 180, borderRadius: 8, objectFit: 'cover' }} />
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-status">Update Status</label>
              <select id="dept-status" className="form-input" value={selected.status}
                onChange={(e) => {
                  updateStatus(selected.id, e.target.value, note);
                  setSelected((p) => ({ ...p, status: e.target.value }));
                  setNote('');
                }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dept-note">Note (optional)</label>
              <textarea id="dept-note" className="form-input" rows={2}
                placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...selected.timeline].reverse().map((entry, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
                  fontSize: 12.5, padding: '6px 10px', background: 'var(--bg)', borderRadius: 5 }}>
                  <StatusBadge status={entry.status} />
                  <span style={{ color: 'var(--text)', flex: 1 }}>{entry.note}</span>
                  <span style={{ color: 'var(--text-light)', fontSize: 11 }}>{formatDate(entry.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        </Modal>
      )}
    </div>
  );
}
