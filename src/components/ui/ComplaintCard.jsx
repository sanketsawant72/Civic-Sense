import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { timeAgo, formatDate } from '../../utils/helpers';
import StatusBadge from './StatusBadge';
import PriorityChip from './PriorityChip';
import CategoryPill from './CategoryPill';
import './ComplaintCard.css';

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate();
  const lang     = useStore((s) => s.lang);

  return (
    <article className="complaint-card" aria-label={`Complaint: ${complaint.title}`}>
      <div className="complaint-card__top">
        <div className="complaint-card__badges">
          <CategoryPill categoryId={complaint.category} />
          <PriorityChip priority={complaint.priority} />
        </div>
        <span className="complaint-card__id">{complaint.id}</span>
      </div>

      <h3 className="complaint-card__title">{complaint.title}</h3>
      <p className="complaint-card__desc">{complaint.description}</p>

      <div className="complaint-card__footer">
        <StatusBadge status={complaint.status} />
        <span
          className="complaint-card__time"
          title={formatDate(complaint.submittedAt, lang)}
        >
          {timeAgo(complaint.submittedAt)}
        </span>
        <button
          className="complaint-card__track"
          onClick={() => navigate(`/track?id=${complaint.id}`)}
          aria-label={`Track complaint ${complaint.id}`}
        >
          Track <ChevronRight size={12} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
