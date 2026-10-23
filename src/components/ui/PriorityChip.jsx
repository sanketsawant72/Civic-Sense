import { PRIORITY_COLOR } from '../../data/constants';
import './PriorityChip.css';

const LABELS = { Low: 'Low', Medium: 'Med', High: 'High', Critical: 'Critical' };

export default function PriorityChip({ priority }) {
  const color = PRIORITY_COLOR[priority] || '#64748B';
  return (
    <span
      className="priority-chip"
      style={{ '--chip-color': color }}
      aria-label={`Priority: ${priority}`}
    >
      {LABELS[priority] || priority}
    </span>
  );
}
