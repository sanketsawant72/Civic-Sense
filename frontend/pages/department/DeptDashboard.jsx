import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Building2,
} from 'lucide-react';
import { useStore }    from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { STATUSES, STATUS_COLOR, catById } from '../../data/constants';
import StatusBadge  from '../../components/ui/StatusBadge';
import PriorityChip from '../../components/ui/PriorityChip';
import { timeAgo }  from '../../utils/helpers';
import './DeptDashboard.css';

export default function DeptDashboard() {
  const navigate = useNavigate();
  const { complaints, loadComplaints, updateStatus } = useStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => { loadComplaints(); }, []); // eslint-disable-line

  const cat     = user?.departmentCategory;
  const deptCat = catById(cat);

  // Status counts scoped to this dept's complaints (already filtered by API)
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  complaints.forEach((c) => { if (c.status in byStatus) byStatus[c.status]++; });

  const pending   = (byStatus['Submitted'] || 0) + (byStatus['Under Review'] || 0);
  const inProgress = byStatus['In Progress'] || 0;
  const resolved  = byStatus['Resolved'] || 0;
  const critical  = complaints.filter((c) => c.priority === 'Critical').length;

  // Complaints needing immediate attention (Submitted or Under Review)
  const actionable = complaints
    .filter((c) => c.status === 'Submitted' || c.status === 'Under Review')
    .slice(0, 8);

  return (
    <div className="dept-dash">
      {/* ── Header ── */}
      <div className="dept-dash__header">
        <div className="dept-dept-badge" style={{ '--cat-color': deptCat.color }}>
          <Building2 size={16} strokeWidth={2} aria-hidden="true" />
          {user?.departmentName || deptCat.dept}
        </div>
        <h1 className="page-title">Department Dashboard</h1>
        <p className="dept-dash__sub">
          Showing all complaints assigned to the <strong>{user?.departmentName || 'your department'}</strong>.
        </p>
      </div>

      {/* ── KPI strip ── */}
      <div className="dept-kpi-row">
        {[
          { icon: ClipboardList, label: 'Total',       value: complaints.length, mod: '' },
          { icon: AlertTriangle, label: 'Needs Action', value: pending,           mod: 'red' },
          { icon: Clock,         label: 'In Progress',  value: inProgress,        mod: 'amber' },
          { icon: CheckCircle2,  label: 'Resolved',     value: resolved,          mod: 'green' },
          { icon: AlertTriangle, label: 'Critical',     value: critical,          mod: 'red' },
        ].map(({ icon: Icon, label, value, mod }) => (
          <div key={label} className={`dept-kpi dept-kpi--${mod || 'default'}`}>
            <span className="dept-kpi__icon"><Icon size={17} strokeWidth={1.8} /></span>
            <span className="dept-kpi__num">{value}</span>
            <span className="dept-kpi__label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Action queue ── */}
      <div className="dept-section">
        <div className="page-header">
          <div>
            <p className="section-label">Requires Action</p>
            <h2>Pending Complaints</h2>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/department/complaints')}>
            All complaints <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {actionable.length === 0 ? (
          <div className="dept-empty">
            <CheckCircle2 size={36} strokeWidth={1.2} />
            <p>No pending complaints — great work!</p>
          </div>
        ) : (
          <div className="dept-queue">
            {actionable.map((c) => (
              <div key={c.id} className="dept-queue-item">
                <div className="dept-queue-item__left">
                  <code className="dept-queue-item__id">{c.id}</code>
                  <p className="dept-queue-item__title">{c.title}</p>
                  <span className="dept-queue-item__time">{timeAgo(c.submittedAt)}</span>
                </div>

                <div className="dept-queue-item__right">
                  <PriorityChip priority={c.priority} />
                  <StatusBadge  status={c.status} />

                  {/* Quick inline status update */}
                  <select
                    className="dept-status-select"
                    value={c.status}
                    style={{ '--s-color': STATUS_COLOR[c.status] }}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                    aria-label={`Update status for ${c.id}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/track?id=${c.id}`)}
                    aria-label={`View ${c.id}`}
                  >
                    View <ChevronRight size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
