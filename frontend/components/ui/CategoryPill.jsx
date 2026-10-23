import { catById } from '../../data/constants';
import { useStore } from '../../store/useStore';
import './CategoryPill.css';

export default function CategoryPill({ categoryId }) {
  const lang = useStore((s) => s.lang);
  const cat  = catById(categoryId);
  return (
    <span
      className="category-pill"
      style={{ '--cat-color': cat.color }}
      title={cat.dept}
    >
      {cat.label[lang] || cat.label.en}
    </span>
  );
}
