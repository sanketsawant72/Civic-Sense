import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t, CATEGORIES, STATUSES, ASHTA, catById, STATUS_COLOR } from '../../data/constants';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityChip from '../../components/ui/PriorityChip';
import { formatDate } from '../../utils/helpers';
import './MapOverview.css';

const PRIORITY_COLOR_MAP = { Critical: '#C94C4C', High: '#E8871E', Medium: '#C68A20', Low: '#23845B' };

const COLOR_MODES = [
  { key: 'category', label: 'Category' },
  { key: 'status',   label: 'Status' },
  { key: 'priority', label: 'Priority' },
];

export default function MapOverview() {
  const { lang, complaints, updateStatus } = useStore();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [colorBy,      setColorBy]      = useState('category');

  const visible = complaints.filter((c) => {
    if (filterStatus && c.status   !== filterStatus) return false;
    if (filterCat    && c.category !== filterCat)    return false;
    return true;
  });

  function getColor(c) {
    if (colorBy === 'status')   return STATUS_COLOR[c.status]         || '#64748B';
    if (colorBy === 'priority') return PRIORITY_COLOR_MAP[c.priority] || '#64748B';
    return catById(c.category).color;
  }

  // Build legend items for current color mode
  const legendItems = colorBy === 'category'
    ? CATEGORIES.map((cat) => ({ label: cat.label[lang] || cat.label.en, color: cat.color }))
    : colorBy === 'status'
      ? STATUSES.map((s)   => ({ label: s, color: STATUS_COLOR[s] }))
      : Object.entries(PRIORITY_COLOR_MAP).map(([p, col]) => ({ label: p, color: col }));

  return (
    <div className="amap-page">
      <div className="page-header">
        <div>
          <p className="section-label">Admin Portal</p>
          <h1 className="page-title">{t('amap', lang)}</h1>
        </div>
        <span className="amap-count">
          <Layers size={13} strokeWidth={2} aria-hidden="true" />
          {visible.length} of {complaints.length} shown
        </span>
      </div>

      {/* ── Controls ── */}
      <div className="amap-controls">
        <div className="amap-filters">
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
        </div>

        <div className="color-mode-group" role="group" aria-label="Color markers by">
          <span className="color-mode-label">Color by:</span>
          {COLOR_MODES.map(({ key, label }) => (
            <button
              key={key}
              className={'btn btn-sm color-mode-btn' + (colorBy === key ? ' color-mode-btn--active' : '')}
              onClick={() => setColorBy(key)}
              aria-pressed={colorBy === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="amap-legend" aria-label="Color legend">
        {legendItems.map(({ label, color }) => (
          <span key={label} className="aleg-chip" style={{ '--leg-color': color }}>
            <span className="aleg-dot" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      {/* ── Map ── */}
      <div className="amap-wrap">
        <MapContainer
          center={[ASHTA.lat, ASHTA.lng]}
          zoom={12}
          className="amap"
          aria-label="Admin map overview"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {visible.map((c) => {
            const color = getColor(c);
            return (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={11}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.82, weight: 2 }}
              >
                <Popup maxWidth={270}>
                  <div className="amap-popup">
                    <span className="amap-popup__id">{c.id}</span>
                    <p className="amap-popup__title">{c.title}</p>
                    <div className="amap-popup__chips">
                      <StatusBadge status={c.status} />
                      <PriorityChip priority={c.priority} />
                    </div>
                    <span className="amap-popup__date">{formatDate(c.submittedAt, lang)}</span>
                    <div className="amap-popup__update">
                      <label className="amap-popup__update-label" htmlFor={`qs-${c.id}`}>
                        Quick update:
                      </label>
                      <div className="inline-select-wrap" style={{ '--s-color': STATUS_COLOR[c.status] }}>
                        <select
                          id={`qs-${c.id}`}
                          className="inline-select"
                          value={c.status}
                          onChange={(e) => updateStatus(c.id, e.target.value)}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={10} strokeWidth={2.5} className="inline-select-icon" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
