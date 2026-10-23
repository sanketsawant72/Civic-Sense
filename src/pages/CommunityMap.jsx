import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, CATEGORIES, STATUSES, ASHTA, catById } from '../data/constants';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityChip from '../components/ui/PriorityChip';
import { timeAgo } from '../utils/helpers';
import './CommunityMap.css';

export default function CommunityMap() {
  const { lang, complaints } = useStore();
  const navigate = useNavigate();
  const [filterCat,    setFilterCat]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const visible = complaints.filter((c) => {
    if (filterCat    && c.category !== filterCat)    return false;
    if (filterStatus && c.status   !== filterStatus) return false;
    return true;
  });

  return (
    <div className="cmap-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <p className="section-label">Live Map</p>
          <h1 className="page-title">{t('cmap', lang)}</h1>
        </div>
        <span className="cmap-count">
          <Layers size={13} strokeWidth={2} aria-hidden="true" />
          {visible.length} of {complaints.length} reports shown
        </span>
      </div>

      {/* ── Filters + Legend row ── */}
      <div className="cmap-toolbar">
        <div className="cmap-filters">
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {(filterCat || filterStatus) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterCat(''); setFilterStatus(''); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Compact legend */}
        <div className="cmap-legend" aria-label="Category legend">
          {CATEGORIES.filter((c) => c.id !== 'other').map((cat) => (
            <button
              key={cat.id}
              className={'legend-chip' + (filterCat === cat.id ? ' legend-chip--active' : '')}
              style={{ '--cat-color': cat.color }}
              onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
              aria-pressed={filterCat === cat.id}
              title={cat.label[lang] || cat.label.en}
            >
              <span className="legend-dot" aria-hidden="true" />
              <span className="legend-label">{cat.label[lang] || cat.label.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="cmap-wrap">
        <MapContainer
          center={[ASHTA.lat, ASHTA.lng]}
          zoom={15}
          className="cmap"
          aria-label="Community complaints map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {visible.map((c) => {
            const cat = catById(c.category);
            return (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={10}
                pathOptions={{
                  color:       cat.color,
                  fillColor:   cat.color,
                  fillOpacity: 0.78,
                  weight:      2,
                }}
              >
                <Popup maxWidth={260} className="civic-popup">
                  <div className="map-popup">
                    <div className="map-popup__badges">
                      <span
                        className="map-popup__cat"
                        style={{ color: cat.color, background: `${cat.color}18` }}
                      >
                        {cat.label[lang] || cat.label.en}
                      </span>
                    </div>
                    <p className="map-popup__title">{c.title}</p>
                    <div className="map-popup__row">
                      <StatusBadge status={c.status} />
                      <PriorityChip priority={c.priority} />
                    </div>
                    <div className="map-popup__footer">
                      <span className="map-popup__time">{timeAgo(c.submittedAt)}</span>
                      <button
                        className="map-popup__track"
                        onClick={() => navigate(`/track?id=${c.id}`)}
                      >
                        Track <ChevronRight size={11} strokeWidth={2.5} />
                      </button>
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
