import { STATUS_COLOR } from '../../data/constants';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '#64748B';
  return (
    <span
      className="status-badge"
      style={{ '--badge-color': color }}
      aria-label={`Status: ${status}`}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
