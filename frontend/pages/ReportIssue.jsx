import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Camera, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Upload, X, MapPin, Locate, AlertCircle, CheckCheck,
  Zap, AlertTriangle, Shield, Truck, Trash2, Droplets,
  Lightbulb, HardHat, HelpCircle, Sparkles, Navigation, Brain,
} from 'lucide-react';
import { useStore }                    from '../store/useStore';
import { t, CATEGORIES, ASHTA }        from '../data/constants';
import { analyzeComplaint }            from '../utils/severity';
import { readFileAsDataUrl }           from '../utils/helpers';
import { extractGpsFromFile }          from '../utils/exif';
import { classifyImage }               from '../utils/api.js';
import './ReportIssue.css';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CAT_ICONS = {
  pothole: Truck, garbage: Trash2, drainage: Droplets,
  water: Droplets, streetlight: Lightbulb, construction: HardHat, other: HelpCircle,
};

// ── Steps: 3 only ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Photo',    icon: Camera },
  { id: 2, label: 'Details',  icon: FileText },
  { id: 3, label: 'Review',   icon: CheckCircle2 },
];

// ── Urgency meta ──────────────────────────────────────────────────────────────
const URGENCY_META = {
  Critical: { color: '#C94C4C', bg: '#FDEAEA', icon: Zap,           label: 'Critical — Immediate attention required' },
  Urgent:   { color: '#C68A20', bg: '#FEF7E8', icon: AlertTriangle,  label: 'Urgent — Action needed soon' },
  Normal:   { color: '#23845B', bg: '#EDFAF4', icon: Shield,         label: 'Normal — Standard resolution timeline' },
};

const PRIORITY_META = {
  High:     { color: '#C96E10', bg: '#FFF0E8' },
  Medium:   { color: '#C68A20', bg: '#FEF7E8' },
  Low:      { color: '#23845B', bg: '#EDFAF4' },
  Critical: { color: '#C94C4C', bg: '#FDEAEA' },
};

const PHOTO_CONFIDENCE_THRESHOLD = 0.4;

function PinPicker({ position, setPosition }) {
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return position ? <Marker position={position} /> : null;
}

// Flies the map to `target` whenever it changes (used by GPS button + EXIF)
function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 17, { duration: 1.2 });
  }, [target, map]);
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReportIssue() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { lang, addComplaint } = useStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]       = useState(1);
  const [photo, setPhoto]     = useState(null);   // base64
  const [position, setPosition] = useState(null); // [lat, lng] from EXIF or map
  const [exifStatus, setExifStatus] = useState(null); // null|'extracting'|'found'|'not_found'
  const [dragOver, setDragOver] = useState(false);

  const [category, setCategory] = useState(params.get('cat') || '');
  const [title, setTitle]       = useState('');
  const [desc,  setDesc]        = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [newId,     setNewId]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // GPS detection state (separate from EXIF — this is the "Use My Location" button)
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [gpsError,    setGpsError]    = useState('');
  const [locSource,   setLocSource]   = useState(''); // 'exif' | 'gps' | 'manual' | ''

  // ── YOLOv8 AI classification state ─────────────────────────────────────────
  const [aiStatus,  setAiStatus]  = useState('idle');   // 'idle'|'loading'|'done'|'error'
  const [aiResult,  setAiResult]  = useState(null);     // ClassifyResponse from Python
  const [photoError, setPhotoError] = useState('');
  // If user accepts AI suggestion, it overrides their manual category pick
  const [aiAccepted, setAiAccepted] = useState(false);

  const fileRef   = useRef();
  const cameraRef = useRef();
  const classificationRequestRef = useRef(0);

  // ── Live AI-style analysis (updates as user types) ────────────────────────
  const analysis = analyzeComplaint(title, desc, category);
  const catObj   = CATEGORIES.find((c) => c.id === analysis.category);
  const CatIcon  = CAT_ICONS[analysis.category] || HelpCircle;
  const urgMeta  = URGENCY_META[analysis.urgency];
  const priMeta  = PRIORITY_META[analysis.priority] || PRIORITY_META.Low;
  const UrgIcon  = urgMeta.icon;
  const selectedCategory = category || analysis.category;
  const photoCategoryMismatch = Boolean(
    aiStatus === 'done' && aiResult && selectedCategory !== aiResult.category
  );

  // ── Step validation ────────────────────────────────────────────────────────
  // Step 1: photo required (camera or upload). Position auto-filled if EXIF found.
  // Step 2: title + desc required.
  const canContinueWithPhoto = aiStatus === 'done' || aiStatus === 'error';
  const canNext = {
    1: !!photo && canContinueWithPhoto && !photoCategoryMismatch,
    2: title.trim().length >= 5 && desc.trim().length >= 10 && !photoCategoryMismatch,
    3: true,
  };

  function next() { if (canNext[step]) setStep((s) => Math.min(s + 1, 3)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  // ── Photo handling ─────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file showing the civic issue.');
      return;
    }

    const requestId = ++classificationRequestRef.current;
    setPhotoError('');
    setAiStatus('loading');
    setAiResult(null);
    setAiAccepted(false);

    try {
      const url = await readFileAsDataUrl(file);
      if (requestId !== classificationRequestRef.current) return;
      setPhoto(url);
      setExifStatus(null);

      const result = await classifyImage(url, file.name);
      if (requestId !== classificationRequestRef.current) return;
      setAiResult(result);

      const knownCategory = CATEGORIES.some((item) => item.id === result.category);
      if (
        result.fallback ||
        !knownCategory ||
        result.category === 'other' ||
        result.confidence < PHOTO_CONFIDENCE_THRESHOLD
      ) {
        setAiStatus('error');
        setPhotoError(
          result.fallback
            ? 'Photo verification is unavailable. You can continue, but select the issue category manually; this photo has not been verified.'
            : 'We could not verify a civic issue in this photo. You can continue, but select the issue category manually; a clearer close-up may help verification.'
        );
        return;
      }

      if (category && category !== result.category) {
        setAiStatus('rejected');
        setPhotoError(
          `This photo appears to show ${CATEGORIES.find((item) => item.id === result.category)?.label.en}, not ${CATEGORIES.find((item) => item.id === category)?.label.en}. Upload a matching photo.`
        );
        return;
      }

      setAiStatus('done');
      if (!category) {
        setCategory(result.category);
        setAiAccepted(true);
      }

      setExifStatus('extracting');
      const gps = await extractGpsFromFile(file);
      if (requestId !== classificationRequestRef.current) return;
      if (gps) {
        setPosition([gps.lat, gps.lng]);
        setExifStatus('found');
        setLocSource('exif');
      } else {
        setExifStatus('not_found');
      }
    } catch {
      if (requestId !== classificationRequestRef.current) return;
      setAiStatus('error');
      setPhotoError('Photo verification is unavailable. You can continue, but select the issue category manually; this photo has not been verified.');
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    e.target.value = '';
    await handleFile(file);
  }
  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    await handleFile(e.dataTransfer.files[0]);
  }

  // ── Use browser GPS ────────────────────────────────────────────────────────
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        setLocSource('gps');
        setGpsLoading(false);
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access and try again.',
          2: 'Location unavailable. Try again or pin manually on the map.',
          3: 'Location request timed out. Please try again.',
        };
        setGpsError(messages[err.code] || 'Could not get location. Pin manually on the map.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!canNext[1] || !canNext[2]) return;
    setSubmitting(true);
    const [lat, lng] = position || [ASHTA.lat, ASHTA.lng];
    try {
      const created = await addComplaint({
        title:       title.trim(),
        description: desc.trim(),
        category:    analysis.category,
        priority:    analysis.priority,
        lat, lng,
        photo,
        submittedBy: 'citizen',
        submittedAt: Date.now(),
      });
      setNewId(created.id);
      setSubmitted(true);
    } catch {
      // error shown by AppShell banner
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="report-success">
        <div className="success-icon-wrap">
          <CheckCheck size={32} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h1 className="success-title">Complaint Submitted</h1>
        <p className="success-desc">
          Your report has been registered. Use the ID below to track progress.
        </p>

        {/* Priority + Urgency summary on success */}
        <div className="success-analysis">
          <span className="sanalysis-item" style={{ background: priMeta.bg, color: priMeta.color }}>
            Priority: <strong>{analysis.priority}</strong>
          </span>
          <span className="sanalysis-item" style={{ background: urgMeta.bg, color: urgMeta.color }}>
            <UrgIcon size={12} strokeWidth={2.5} /> Urgency: <strong>{analysis.urgency}</strong>
          </span>
        </div>

        <div className="success-id-box">
          <span className="success-id-label">Complaint ID</span>
          <span className="success-id">{newId}</span>
        </div>

        <div className="success-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/track?id=${newId}`)}>
            <CheckCircle2 size={15} strokeWidth={2} /> Track this Complaint
          </button>
          <button className="btn btn-outline" onClick={() => {
            setSubmitted(false); setStep(1);
            setCategory(''); setTitle(''); setDesc('');
            setPhoto(null); setPosition(null); setExifStatus(null);
            setLocSource(''); setGpsError('');
            setAiStatus('idle'); setAiResult(null); setAiAccepted(false);
          }}>
            Report Another Issue
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="report-page">
      <div className="report-page-header">
        <div>
          <p className="section-label">Civic Issue Reporting</p>
          <h1 className="page-title">{t('report', lang)}</h1>
        </div>
      </div>

      {/* ── Stepper ── */}
      <nav className="stepper" aria-label="Form steps">
        {STEPS.map(({ id, label, icon: Icon }) => {
          const done   = step > id;
          const active = step === id;
          return (
            <div
              key={id}
              className={
                'stepper-step' +
                (active ? ' stepper-step--active' : '') +
                (done   ? ' stepper-step--done'   : '')
              }
            >
              <div className="stepper-circle" aria-current={active ? 'step' : undefined}>
                {done
                  ? <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
                  : <Icon         size={14} strokeWidth={2}   aria-hidden="true" />
                }
              </div>
              <span className="stepper-label">{label}</span>
              {id < STEPS.length && <div className="stepper-line" aria-hidden="true" />}
            </div>
          );
        })}
      </nav>

      <div className="report-panel">

        {/* ══════════════════════════════════════════════════════
            STEP 1 — PHOTO FIRST
            Auto-extracts GPS, sets position automatically
        ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="step-content">
            <h2 className="step-title">Take or upload a photo first</h2>
            <p className="step-desc">
              Start by capturing a photo of the issue. If your camera has GPS enabled,
              we will automatically extract the location — no manual pinning needed.
            </p>

            {photo ? (
              /* ── Photo preview + EXIF status ── */
              <div className="photo-captured">
                <div className="photo-captured__img-wrap">
                  <img src={photo} alt="Captured issue" className="photo-captured__img" />
                  <button
                    className="photo-captured__retake"
                    onClick={() => {
                      classificationRequestRef.current += 1;
                      setPhoto(null);
                      setExifStatus(null);
                      setPosition(null);
                      setLocSource('');
                      setAiStatus('idle');
                      setAiResult(null);
                      setPhotoError('');
                    }}
                    aria-label="Retake photo"
                  >
                    <Camera size={14} strokeWidth={2} /> Retake
                  </button>
                </div>

                {/* Location extraction status */}
                <div className="exif-result">
                  {exifStatus === 'extracting' && (
                    <div className="exif-card exif-card--loading">
                      <div className="exif-spinner" aria-hidden="true" />
                      <div>
                        <p className="exif-card__title">Reading GPS from photo…</p>
                        <p className="exif-card__sub">Extracting location metadata</p>
                      </div>
                    </div>
                  )}

                  {exifStatus === 'found' && position && (
                    <div className="exif-card exif-card--success">
                      <MapPin size={20} strokeWidth={2} className="exif-card__icon" aria-hidden="true" />
                      <div>
                        <p className="exif-card__title">Location extracted from photo</p>
                        <p className="exif-card__coords">
                          {position[0].toFixed(5)}, {position[1].toFixed(5)}
                        </p>
                        <p className="exif-card__sub">Location will be pinned automatically on the map</p>
                      </div>
                    </div>
                  )}

                  {exifStatus === 'not_found' && (
                    <div className="exif-card exif-card--warn">
                      <MapPin size={20} strokeWidth={2} className="exif-card__icon" aria-hidden="true" />
                      <div>
                        <p className="exif-card__title">No GPS found in this photo</p>
                        <p className="exif-card__sub">
                          You can pin the location manually on the map in the Review step.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Classification result */}
                <div className="ai-classify-section">
                  {aiStatus === 'loading' && (
                    <div className="ai-classify-card ai-classify-card--loading">
                      <div className="ai-classify-card__header">
                        <div className="ai-classify-spinner" aria-hidden="true" />
                        <span>YOLOv8 AI is analysing your photo…</span>
                      </div>
                    </div>
                  )}

                  {aiStatus === 'done' && aiResult && !aiResult.fallback && (
                    <div className="ai-classify-card ai-classify-card--result">
                      <div className="ai-classify-card__header">
                        <Brain size={16} strokeWidth={2} className="ai-classify-card__brain" aria-hidden="true" />
                        <span className="ai-classify-card__title">AI Detection Result</span>
                        <span className="ai-classify-card__model">YOLOv8n</span>
                      </div>

                      <div className="ai-classify-card__body">
                        {/* Predicted category */}
                        <div className="ai-predict-row">
                          <div className="ai-predict-main">
                            {(() => {
                              const c = CATEGORIES.find((x) => x.id === aiResult.category);
                              const Icon = CAT_ICONS[aiResult.category] || HelpCircle;
                              return (
                                <>
                                  <span
                                    className="ai-predict-label"
                                    style={{ background: c?.color + '18', color: c?.color }}
                                  >
                                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                                    {aiResult.category_label}
                                  </span>
                                  {c && (
                                    <span className="ai-predict-dept">{c.dept}</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Confidence bar */}
                          <div className="ai-confidence-wrap">
                            <div className="ai-confidence-bar">
                              <div
                                className="ai-confidence-bar__fill"
                                style={{
                                  width: `${Math.round(aiResult.confidence * 100)}%`,
                                  background: aiResult.confidence >= 0.7
                                    ? 'var(--success)'
                                    : aiResult.confidence >= 0.4
                                      ? 'var(--warning)'
                                      : 'var(--danger)',
                                }}
                                aria-label={`Confidence: ${Math.round(aiResult.confidence * 100)}%`}
                              />
                            </div>
                            <span className="ai-confidence-pct">
                              {Math.round(aiResult.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>

                        {/* Detected objects list */}
                        {aiResult.detected_objects?.length > 0 && (
                          <div className="ai-objects">
                            <span className="ai-objects__label">Objects detected:</span>
                            <div className="ai-objects__chips">
                              {aiResult.detected_objects.slice(0, 5).map((obj, i) => (
                                <span key={i} className="ai-obj-chip">
                                  {obj.label}
                                  <span className="ai-obj-chip__conf">
                                    {Math.round(obj.confidence * 100)}%
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Accept / override actions */}
                        <div className="ai-actions">
                          {aiAccepted ? (
                            <div className="ai-accepted-badge">
                              <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />
                              AI suggestion applied — you can change it in the next step
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setCategory(aiResult.category);
                                  setAiAccepted(true);
                                }}
                              >
                                <CheckCircle2 size={13} strokeWidth={2} /> Accept suggestion
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setAiAccepted(false)}
                              >
                                I will select manually
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {aiStatus === 'error' && (
                    <div className="ai-classify-card ai-classify-card--offline">
                      <Brain size={14} strokeWidth={2} aria-hidden="true" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {aiStatus === 'rejected' && (
                    <div className="ai-classify-card ai-classify-card--offline" role="alert">
                      <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                      <span>{photoError}</span>
                    </div>
                  )}
                </div>

                {/* Mini map preview if location found */}
                {position && exifStatus === 'found' && (
                  <div className="mini-map-wrap">
                    <p className="mini-map-label">
                      <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
                      Pinned location from photo
                    </p>
                    <div className="mini-map">
                      <MapContainer
                        center={position}
                        zoom={16}
                        className="mini-map__map"
                        zoomControl={false}
                        scrollWheelZoom={false}
                        dragging={false}
                        aria-label="Extracted photo location"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution=""
                        />
                        <Marker position={position} />
                      </MapContainer>
                    </div>
                  </div>
                )}

                {aiStatus === 'done' && (
                  <p className="photo-hint-ok">
                    <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />
                    Issue-related photo verified. Click Continue to describe the issue.
                  </p>
                )}
              </div>
            ) : (
              /* ── Upload options ── */
              <div className="photo-upload-area">
                {photoError && (
                  <div className="ai-classify-card ai-classify-card--offline" role="alert">
                    <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{photoError}</span>
                  </div>
                )}

                {/* PRIMARY: Camera button (most prominent) */}
                <button
                  type="button"
                  className="camera-primary-btn"
                  onClick={() => cameraRef.current?.click()}
                  aria-label="Open camera to take a photo"
                >
                  <Camera size={36} strokeWidth={1.5} className="camera-primary-btn__icon" aria-hidden="true" />
                  <span className="camera-primary-btn__title">Take a Photo</span>
                  <span className="camera-primary-btn__sub">
                    Use your device camera · GPS location auto-detected
                  </span>
                </button>

                <div className="upload-divider" aria-hidden="true">
                  <span>or upload from gallery</span>
                </div>

                {/* SECONDARY: Upload from device */}
                <div
                  className={'drop-zone' + (dragOver ? ' drop-zone--over' : '')}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                  aria-label="Upload a photo from your device"
                >
                  <Upload size={22} strokeWidth={1.5} className="drop-zone__icon" aria-hidden="true" />
                  <p className="drop-zone__title">Upload from device</p>
                  <p className="drop-zone__sub">JPG, PNG, WEBP — GPS data will be read if available</p>
                </div>

                <div className="photo-tip">
                  <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    <strong>Tip:</strong> For best results, enable Location in your camera app before taking the photo.
                    This allows automatic location detection.
                  </span>
                </div>
              </div>
            )}

            {/* Hidden inputs */}
            <input ref={fileRef}   type="file" accept="image/*"           className="sr-only" onChange={handlePhotoChange} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoChange} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — DETAILS + LIVE AI ANALYSIS
        ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="step-content">
            <h2 className="step-title">Describe the problem</h2>
            <p className="step-desc">
              As you type, our system automatically detects the issue category, priority and urgency.
            </p>

            {/* Category quick-select */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Category <span className="form-label-opt">(tap to override auto-detection)</span></label>
              <div className="cat-quick-grid">
                {CATEGORIES.map((cat) => {
                  const Icon = CAT_ICONS[cat.id] || HelpCircle;
                  const isSelected = (category || analysis.category) === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={'cat-quick-btn' + (isSelected ? ' cat-quick-btn--active' : '')}
                      style={{ '--cat-color': cat.color }}
                      onClick={() => setCategory(cat.id === category ? '' : cat.id)}
                      aria-pressed={isSelected}
                    >
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                      <span>{cat.label[lang] || cat.label.en}</span>
                    </button>
                  );
                })}
              </div>
              {photoCategoryMismatch && (
                <p className="photo-category-warning" role="alert">
                  The photo was verified as {CATEGORIES.find((item) => item.id === aiResult.category)?.label.en}.
                  Choose that category or retake the photo; unrelated evidence cannot be submitted.
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="r-title" className="form-label">
                Issue Title <span className="required">*</span>
              </label>
              <input
                id="r-title"
                type="text"
                className="form-input"
                placeholder="e.g. Large pothole on Main Road near bus stand"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                autoFocus
              />
              <span className="form-hint">{title.length}/120</span>
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label htmlFor="r-desc" className="form-label">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="r-desc"
                className="form-input"
                placeholder="Describe the exact location, severity, and how long the issue has been present…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <span className="form-hint">{desc.length}/1000 · min 10 characters</span>
            </div>

            {/* ── Live AI Analysis panel — shows as user types ── */}
            {(title.length >= 3 || desc.length >= 3) && (
              <div className="ai-analysis-panel">
                <div className="ai-analysis-panel__header">
                  <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
                  <span>Auto Analysis</span>
                  <span className={'ai-confidence ai-confidence--' + analysis.confidence}>
                    {analysis.confidence} confidence
                  </span>
                </div>

                <div className="ai-analysis-panel__grid">
                  {/* Category */}
                  <div className="ai-result-item">
                    <span className="ai-result-item__label">Category</span>
                    <span
                      className="ai-result-item__val"
                      style={{ background: catObj?.color + '18', color: catObj?.color }}
                    >
                      <CatIcon size={12} strokeWidth={2} aria-hidden="true" />
                      {catObj?.label[lang] || catObj?.label.en}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="ai-result-item">
                    <span className="ai-result-item__label">Priority</span>
                    <span
                      className="ai-result-item__val"
                      style={{ background: priMeta.bg, color: priMeta.color }}
                    >
                      {analysis.priority}
                    </span>
                  </div>

                  {/* Urgency */}
                  <div className="ai-result-item">
                    <span className="ai-result-item__label">Urgency</span>
                    <span
                      className="ai-result-item__val"
                      style={{ background: urgMeta.bg, color: urgMeta.color }}
                    >
                      <UrgIcon size={12} strokeWidth={2} aria-hidden="true" />
                      {analysis.urgency}
                    </span>
                  </div>

                  {/* Department */}
                  <div className="ai-result-item">
                    <span className="ai-result-item__label">Assigned to</span>
                    <span className="ai-result-item__val ai-result-item__val--dept">
                      {catObj?.dept || 'General Administration'}
                    </span>
                  </div>
                </div>

                {/* Urgency description */}
                <div
                  className="ai-urgency-bar"
                  style={{ background: urgMeta.bg, borderColor: urgMeta.color + '44', color: urgMeta.color }}
                >
                  <UrgIcon size={14} strokeWidth={2} aria-hidden="true" />
                  {urgMeta.label}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3 — REVIEW + LOCATION MAP + SUBMIT
        ══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="step-content">
            <h2 className="step-title">Review and submit</h2>
            <p className="step-desc">Confirm all details before submitting to the municipal office.</p>

            <div className="review-layout">
              {/* ── Left: details ── */}
              <div className="review-details">
                {/* Photo thumbnail */}
                {photo && (
                  <div className="review-photo-wrap">
                    <img src={photo} alt="Issue evidence" className="review-photo-thumb" />
                    <span className="review-photo-badge">
                      <Camera size={11} strokeWidth={2} /> Photo attached
                    </span>
                  </div>
                )}

                {/* Analysis badges */}
                <div className="review-badges">
                  <span className="review-badge" style={{ background: catObj?.color + '18', color: catObj?.color }}>
                    <CatIcon size={13} strokeWidth={2} aria-hidden="true" />
                    {catObj?.label[lang] || catObj?.label.en}
                  </span>
                  <span className="review-badge" style={{ background: priMeta.bg, color: priMeta.color }}>
                    Priority: {analysis.priority}
                  </span>
                  <span className="review-badge" style={{ background: urgMeta.bg, color: urgMeta.color }}>
                    <UrgIcon size={12} strokeWidth={2} aria-hidden="true" />
                    {analysis.urgency}
                  </span>
                </div>

                {/* Details table */}
                <div className="review-table">
                  <div className="review-row">
                    <span className="review-key">Title</span>
                    <span className="review-val">{title}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-key">Description</span>
                    <span className="review-val review-val--desc">{desc}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-key">Department</span>
                    <span className="review-val">{catObj?.dept}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-key">Location</span>
                    <span className="review-val">
                      {position
                        ? <>
                            {position[0].toFixed(5)}, {position[1].toFixed(5)}
                            {locSource === 'exif'   && <span className="loc-source"> · from photo</span>}
                            {locSource === 'gps'    && <span className="loc-source loc-source--gps"> · device GPS</span>}
                            {locSource === 'manual' && <span className="loc-source loc-source--manual"> · manual pin</span>}
                          </>
                        : <span className="loc-default">Not pinned — city center will be used</span>
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Right: editable location map ── */}
              <div className="review-map-side">
                {/* Location source label */}
                <div className="map-source-row">
                  <p className="review-map-label">
                    <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
                    {locSource === 'exif' && 'Auto-extracted from photo GPS'}
                    {locSource === 'gps'  && 'Detected from your device GPS'}
                    {locSource === 'manual' && 'Manually pinned on map'}
                    {!locSource && 'Pin your location (tap map or use GPS)'}
                  </p>
                  {position && (
                    <span className={'loc-source-badge loc-source-badge--' + (locSource || 'manual')}>
                      {locSource === 'exif'   && <><Camera   size={11} strokeWidth={2} /> From photo</>}
                      {locSource === 'gps'    && <><Navigation size={11} strokeWidth={2} /> Device GPS</>}
                      {locSource === 'manual' && <><MapPin   size={11} strokeWidth={2} /> Manual</>}
                      {!locSource             && <><MapPin   size={11} strokeWidth={2} /> Manual</>}
                    </span>
                  )}
                </div>

                {/* "Use My Current Location" button */}
                <button
                  type="button"
                  className={'use-location-btn' + (gpsLoading ? ' use-location-btn--loading' : '')}
                  onClick={useCurrentLocation}
                  disabled={gpsLoading}
                  aria-label="Use my current location"
                >
                  {gpsLoading
                    ? <><span className="gps-spinner" aria-hidden="true" /> Detecting location…</>
                    : <><Navigation size={15} strokeWidth={2} aria-hidden="true" /> Use My Current Location</>
                  }
                </button>

                {/* GPS error */}
                {gpsError && (
                  <div className="gps-error" role="alert">
                    <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                    {gpsError}
                  </div>
                )}

                {/* Confirmed coordinates chip */}
                {position && (
                  <div className="coords-chip">
                    <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
                    <span className="coords-chip__val">
                      {position[0].toFixed(6)}, {position[1].toFixed(6)}
                    </span>
                    <span className="coords-chip__label">Tap map to adjust</span>
                  </div>
                )}

                {/* Map — MapController flies to new coordinates automatically */}
                <div className="review-map-wrap">
                  <MapContainer
                    center={position || [ASHTA.lat, ASHTA.lng]}
                    zoom={position ? 17 : 12}
                    className="review-map"
                    aria-label="Confirm issue location"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    />
                    <PinPicker
                      position={position}
                      setPosition={(pos) => { setPosition(pos); setLocSource('manual'); }}
                    />
                    <MapController target={position} />
                  </MapContainer>
                </div>

                {position && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm clear-pin-btn"
                    onClick={() => { setPosition(null); setLocSource(''); setGpsError(''); }}
                  >
                    <X size={12} /> Clear pin
                  </button>
                )}
              </div>
            </div>

            {/* Urgency notice */}
            <div
              className="submit-urgency-notice"
              style={{ background: urgMeta.bg, borderColor: urgMeta.color + '55', color: urgMeta.color }}
            >
              <UrgIcon size={15} strokeWidth={2} aria-hidden="true" />
              <span>
                <strong>{analysis.urgency} urgency</strong> — {urgMeta.label}.
                This will be sent to <strong>{catObj?.dept}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="step-nav">
          {step > 1 && (
            <button type="button" className="btn btn-outline" onClick={back}>
              <ChevronLeft size={15} strokeWidth={2.5} aria-hidden="true" /> Back
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={next}
                disabled={!canNext[step]}
              >
                Continue <ChevronRight size={15} strokeWidth={2.5} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <span className="auth-spinner" aria-hidden="true" />
                  : <CheckCheck size={16} strokeWidth={2.5} aria-hidden="true" />
                }
                {submitting ? 'Submitting…' : 'Submit Complaint'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
