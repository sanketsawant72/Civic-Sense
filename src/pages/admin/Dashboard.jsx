import {
  Chart as ChartJS, ArcElement, BarElement, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t, CATEGORIES, STATUSES, STATUS_COLOR, PRIORITY_COLOR } from '../../data/constants';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityChip from '../../components/ui/PriorityChip';
import { timeAgo } from '../../utils/helpers';
import './Dashboard.css';

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
);

const BASE_CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export default function Dashboard() {
  const { lang, complaints, getStats } = useStore();
  const stats    = getStats();
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const critical = complaints.filter((c) => c.priority === 'Critical').length;
  const resRate  = stats.total ? Math.round((resolved / stats.total) * 100) : 0;

  /* ── Chart data ── */
  const catData = {
    labels: CATEGORIES.map((c) => c.label[lang] || c.label.en),
    datasets: [{
      data: CATEGORIES.map((c) => stats.byCategory[c.id] || 0),
      backgroundColor: CATEGORIES.map((c) => c.color + 'cc'),
      borderColor:     CATEGORIES.map((c) => c.color),
      borderWidth: 1.5,
    }],
  };

  const statusData = {
    labels: STATUSES,
    datasets: [{
      label: 'Complaints',
      data:            STATUSES.map((s) => stats.byStatus[s] || 0),
      backgroundColor: STATUSES.map((s) => STATUS_COLOR[s] + 'bb'),
      borderColor:     STATUSES.map((s) => STATUS_COLOR[s]),
      borderWidth: 1.5,
      borderRadius: 4,
    }],
  };

  const DAY = 86_400_000;
  const now = Date.now();
  const trendLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const trendData = trendLabels.map((_, i) => {
    const start = now - (6 - i) * DAY;
    return complaints.filter((c) => c.submittedAt >= start && c.submittedAt < start + DAY).length;
  });
  const lineData = {
    labels: trendLabels,
    datasets: [{
      label: 'Submitted',
      data: trendData,
      borderColor:     '#173B63',
      backgroundColor: 'rgba(23,59,99,0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointBackgroundColor: '#173B63',
      borderWidth: 2,
    }],
  };

  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  const priData = {
    labels: priorities,
    datasets: [{
      data: priorities.map((p) => complaints.filter((c) => c.priority === p).length),
      backgroundColor: priorities.map((p) => PRIORITY_COLOR[p] + 'cc'),
      borderColor:     priorities.map((p) => PRIORITY_COLOR[p]),
      borderWidth: 1.5,
    }],
  };

  const LEGEND_OPTS = {
    ...BASE_CHART_OPTS,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 14 },
      },
    },
  };

  const recent5 = complaints.slice(0, 5);

  const KPI_CARDS = [
    { icon: ClipboardList, label: 'Total Reports',    value: stats.total, mod: '' },
    { icon: CheckCircle2,  label: 'Resolved',         value: resolved,    mod: 'green' },
    { icon: Clock,         label: 'In Progress',      value: stats.byStatus['In Progress'] || 0, mod: 'amber' },
    { icon: AlertTriangle, label: 'Critical',         value: critical,    mod: 'red' },
    { icon: TrendingUp,    label: 'Resolution Rate',  value: `${resRate}%`, mod: 'teal' },
  ];

  return (
    <div className="dash">
      <div>
        <p className="section-label">Admin Portal</p>
        <h1 className="page-title">{t('dash', lang)}</h1>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-row">
        {KPI_CARDS.map(({ icon: Icon, label, value, mod }) => (
          <div key={label} className={`kpi-card kpi-card--${mod || 'default'}`}>
            <div className="kpi-card__icon-wrap" aria-hidden="true">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="kpi-card__body">
              <span className="kpi-card__value">{value}</span>
              <span className="kpi-card__label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row 1 ── */}
      <div className="chart-row">
        <div className="chart-card">
          <h2 className="chart-card__title">By Category</h2>
          <div className="chart-wrap chart-wrap--sm">
            <Doughnut data={catData} options={LEGEND_OPTS} />
          </div>
        </div>
        <div className="chart-card chart-card--wide">
          <h2 className="chart-card__title">By Status</h2>
          <div className="chart-wrap">
            <Bar data={statusData} options={BASE_CHART_OPTS} />
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="chart-row">
        <div className="chart-card chart-card--wide">
          <h2 className="chart-card__title">Submissions — Last 7 Days</h2>
          <div className="chart-wrap">
            <Line data={lineData} options={BASE_CHART_OPTS} />
          </div>
        </div>
        <div className="chart-card">
          <h2 className="chart-card__title">By Priority</h2>
          <div className="chart-wrap chart-wrap--sm">
            <Doughnut data={priData} options={LEGEND_OPTS} />
          </div>
        </div>
      </div>

      {/* ── Recent table ── */}
      <div className="dash-table-card">
        <h2 className="chart-card__title">Recent Complaints</h2>
        <div className="dash-table-scroll">
          <table className="dash-table" aria-label="Recent complaints">
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Category</th>
                <th>Status</th><th>Priority</th><th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recent5.map((c) => {
                const cat = CATEGORIES.find((x) => x.id === c.category);
                return (
                  <tr key={c.id}>
                    <td className="td-mono">{c.id}</td>
                    <td className="td-title" title={c.title}>{c.title}</td>
                    <td>
                      <span className="td-cat" style={{ '--cat-color': cat?.color || '#64748B' }}>
                        {cat?.label[lang] || cat?.label.en || c.category}
                      </span>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><PriorityChip priority={c.priority} /></td>
                    <td className="td-date">{timeAgo(c.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
