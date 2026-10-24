import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Tag, FileText, Camera, MapPin, CheckCircle2,
  ChevronRight, ChevronLeft, Upload, X, AlertCircle,
  Lightbulb, Truck, Droplets, Trash2, HardHat, HelpCircle,
  CheckCheck, Locate, Brain,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t, CATEGORIES, ASHTA } from '../data/constants';
import { detectPriority, detectCategory } from '../utils/severity';
import { readFileAsDataUrl } from '../utils/helpers';
import { extractGpsFromFile } from '../utils/exif';
import { classifyImage } from '../utils/api';
import './ReportIssue.css';

// Fix Leaflet default icon
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

const STEPS = [
  { id: 1, label: 'Category',  icon: Tag },
  { id: 2, label: 'Details',   icon: FileText },
  { id: 3, label: 'Photo',     icon: Camera },
  { id: 4, label: 'Location',  icon: MapPin },
  { id: 5, label: 'Review',    icon: CheckCircle2 },
];
const MIN_IMAGE_CONFIDENCE = 0.55;

function PinPicker({ position, setPosition }) {
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return position ? <Marker position={position} /> : null;
}

function getDeviceLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 12000 }
    );
  });
}

async function getPhotoLocation(file) {
  const photoLocation = await extractGpsFromFile(file);
  if (photoLocation) return { ...photoLocation, source: 'photo' };

  const deviceLocation = await getDeviceLocation();
  return deviceLocation ? { ...deviceLocation, source: 'device' } : null;
}

export default function ReportIssue() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { lang, addComplaint } = useStore();

  const [step, setStep]           = useState(1);
  const [category, setCategory]   = useState(params.get('cat') || '');
  const [title, setTitle]         = useState('');
  const [desc, setDesc]           = useState('');
  const [photo, setPhoto]         = useState(null);
  const [position, setPosition]   = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId]         = useState('');
  const [dragOver, setDragOver]   = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [aiMessage, setAiMessage] = useState('');
    const [aiResult, setAiResult] = useState(null);
  // EXIF extraction state
  const [exifStatus, setExifStatus] = useState(null); // null | 'extracting' | 'found' | 'not_found'

  const fileRef   = useRef();
  const cameraRef = useRef();

  const priority     = detectPriority(`${title} ${desc}`);
  const suggestedCat = category || detectCategory(`${title} ${desc}`, CATEGORIES);
  const catObj       = CATEGORIES.find((c) => c.id === suggestedCat);

  // ── step validation ──────────────────────────────────────────
  const canNext = {
    1: !!category,
    2: title.trim().length >= 5 && desc.trim().length >= 10,
    3: true,     // photo optional
    4: true,     // location optional (falls back to ASHTA)
    5: true,
  };

  function next() { if (canNext[step]) setStep((s) => Math.min(s + 1, 5)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  // ── photo handling ───────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAiStatus('rejected');
      setAiMessage('Choose an image file to continue.');
      return;
    }

    setPhoto(null);
    setAiResult(null);
    setAiMessage('Checking whether this photo shows a civic issue…');
    setAiStatus('checking');
    setExifStatus('extracting');

    try {
      const url = await readFileAsDataUrl(file);
      const [classification, location] = await Promise.allSettled([
        classifyImage(url, file.name),
        getPhotoLocation(file),
      ]);

      const result = classification.status === 'fulfilled' ? classification.value : null;
      const photoLocation = location.status === 'fulfilled' ? location.value : null;
      if (photoLocation) {
        setPosition([photoLocation.lat, photoLocation.lng]);
        setExifStatus(photoLocation.source === 'photo' ? 'found' : 'device_found');
      } else {
        setExifStatus('not_found');
      }

      if (!result) {
        setAiStatus('rejected');
        setAiMessage(classification.reason?.message || 'Photo verification is unavailable. Please try again later or continue without a photo.');
        return;
      }

      const predictedCategory = CATEGORIES.find((item) => item.id === result.category);
      if (
        !predictedCategory ||
        result.category === 'other' ||
        result.confidence < MIN_IMAGE_CONFIDENCE
      ) {
        setAiStatus('rejected');
        setAiMessage('We could not verify a civic issue in this photo. Try a clearer photo focused on the reported problem.');
        return;
      }

      setPhoto(url);
      setCategory(result.category);
      setAiResult(result);
      setAiStatus('verified');
    } catch (error) {
      setExifStatus('not_found');
      setAiStatus('rejected');
      setAiMessage(error?.message || 'Photo verification is unavailable. Please try again later or continue without a photo.');
    }
  }
  function handlePhotoChange(e) {
    handleFile(e.target.files[0]);
  }
  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    await handleFile(e.dataTransfer.files[0]);
  }

  // ── submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    const [lat, lng] = position || [ASHTA.lat, ASHTA.lng];
    try {
      const created = await addComplaint({
        title:       title.trim(),
        description: desc.trim(),
        category:    suggestedCat,
        priority,
        lat, lng,
        photo,
        submittedBy: 'citizen',
        submittedAt: Date.now(),
      });
      setNewId(created.id);
      setSubmitted(true);
    } catch {
      // error surfaced by AppShell banner via store.error
    }
  }

  // ── success screen ───────────────────────────────────────────
  if (submitted) {
    return (
      <div className="report-success">
        <div className="success-icon-wrap">
          <CheckCheck size={32} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h1 className="success-title">Complaint Submitted</h1>
        <p className="success-desc">
          Your report has been registered with the municipal office. Use the ID below to track progress.
        </p>
        <div className="success-id-box">
          <span className="success-id-label">Complaint ID</span>
          <span className="success-id">{newId}</span>
        </div>
        <div className="success-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/track?id=${newId}`)}>
            <CheckCircle2 size={15} strokeWidth={2} /> Track this Complaint
          </button>
          <button className="btn btn-outline" onClick={() => {
            setSubmitted(false); setStep(1); setCategory('');
            setTitle(''); setDesc(''); setPhoto(null); setPosition(null);
            setAiStatus('idle'); setAiMessage(''); setAiResult(null); setExifStatus(null);
          }}>
            Report Another Issue
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* ── Page header ── */}
      <div className="report-page-header">
        <div>
          <p className="section-label">Civic Issue Reporting</p>
          <h1 className="page-title">{t('report', lang)}</h1>
        </div>
      </div>

      {/* ── Stepper ── */}
      <nav className="stepper" aria-label="Form steps">
        {STEPS.map(({ id, label, icon: Icon }) => {
          const done    = step > id;
          const active  = step === id;
          return (
            <div
              key={id}
              className={'stepper-step' + (active ? ' stepper-step--active' : '') + (done ? ' stepper-step--done' : '')}
            >
              <div className="stepper-circle" aria-current={active ? 'step' : undefined}>
                {done
                  ? <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
                  : <Icon size={14} strokeWidth={2} aria-hidden="true" />
                }
              </div>
              <span className="stepper-label">{label}</span>
              {id < STEPS.length && <div className="stepper-line" aria-hidden="true" />}
            </div>
          );
        })}
      </nav>

      {/* ── Step panels ── */}
      <div className="report-panel">

        {/* Step 1 — Category */}
        {step === 1 && (
          <div className="step-content">
            <h2 className="step-title">What type of issue are you reporting?</h2>
            <p className="step-desc">Select the category that best describes the problem.</p>
            <div className="cat-picker-grid">
              {CATEGORIES.map((cat) => {
                const Icon = CAT_ICONS[cat.id] || HelpCircle;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={'cat-pick-card' + (category === cat.id ? ' cat-pick-card--selected' : '')}
                    style={{ '--cat-color': cat.color }}
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={category === cat.id}
                  >
                    <span className="cat-pick-card__icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="cat-pick-card__label">{cat.label[lang] || cat.label.en}</span>
                    <span className="cat-pick-card__dept">{cat.dept}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <div className="step-content">
            <h2 className="step-title">Describe the problem</h2>
            <p className="step-desc">Provide a clear title and detailed description. This helps the team act faster.</p>

            {/* Auto-detect hint removed */}

            <div className="form-group">
              <label htmlFor="r-title" className="form-label">
                Issue Title <span className="required" aria-hidden="true">*</span>
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
              <span className="form-hint">{title.length}/120 characters</span>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label htmlFor="r-desc" className="form-label">
                Description <span className="required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="r-desc"
                className="form-input"
                placeholder="Describe the exact location, size, severity, and how long the issue has been present…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                maxLength={1000}
              />
              <span className="form-hint">{desc.length}/1000 characters · Minimum 10 characters required</span>
            </div>
          </div>
        )}

        {/* Step 3 — Photo */}
        {step === 3 && (
          <div className="step-content">
            <h2 className="step-title">Add photographic evidence</h2>
            <p className="step-desc">
              Photos are checked for a civic issue before they are attached. We use photo GPS when available, or ask your device for its current location.
            </p>

            {aiStatus !== 'idle' && (
              <div className={`photo-ai-status photo-ai-status--${aiStatus}`} role="status" aria-live="polite">
                <Brain size={15} strokeWidth={2} aria-hidden="true" />
                <span>
                  {aiStatus === 'verified' && aiResult
                    ? `Detected ${aiResult.category_label} (${Math.round(aiResult.confidence * 100)}% confidence). Category updated.`
                    : aiMessage}
                </span>
              </div>
            )}

            {photo ? (
              <div className="photo-preview-wrap">
                <img src={photo} alt="Issue preview" className="photo-preview" />

                {/* EXIF status banner */}
                {exifStatus === 'extracting' && (
                  <div className="exif-status exif-status--loading">
                    <Locate size={14} strokeWidth={2} aria-hidden="true" />
                    Checking photo GPS and device location…
                  </div>
                )}
                {exifStatus === 'found' && position && (
                  <div className="exif-status exif-status--found">
                    <MapPin size={14} strokeWidth={2.5} aria-hidden="true" />
                    Location extracted from photo — {position[0].toFixed(5)}, {position[1].toFixed(5)}
                  </div>
                )}
                {exifStatus === 'device_found' && position && (
                  <div className="exif-status exif-status--found">
                    <MapPin size={14} strokeWidth={2.5} aria-hidden="true" />
                    Current device location added — confirm the issue location on the map.
                  </div>
                )}
                {exifStatus === 'not_found' && (
                  <div className="exif-status exif-status--none">
                    <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                    Location unavailable. Allow browser location access or pin the issue manually on the map.
                  </div>
                )}

                <button
                  type="button"
                  className="photo-remove btn btn-outline btn-sm"
                  onClick={() => { setPhoto(null); setExifStatus(null); setAiResult(null); setAiStatus('idle'); setAiMessage(''); }}
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" /> Remove photo
                </button>
              </div>
            ) : (
              <>
                {/* Upload options */}
                <div className="photo-options">
                  {/* Drag & drop / browse */}
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
                    <Upload size={26} strokeWidth={1.5} className="drop-zone__icon" aria-hidden="true" />
                    <p className="drop-zone__title">Upload from device</p>
                    <p className="drop-zone__sub">Drag & drop or click to browse · JPG, PNG, WEBP</p>
                  </div>

                  <div className="photo-options-divider" aria-hidden="true">
                    <span>or</span>
                  </div>

                  {/* Camera capture */}
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={() => cameraRef.current?.click()}
                    aria-label="Take a photo using your camera"
                  >
                    <Camera size={26} strokeWidth={1.5} className="camera-btn__icon" aria-hidden="true" />
                    <p className="camera-btn__title">Take a photo</p>
                    <p className="camera-btn__sub">Use your device camera</p>
                  </button>
                </div>

                <p className="photo-hint">
                  <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                  Image verification uses the configured AI service. You can continue without attaching a photo.
                </p>
              </>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
              aria-label="Upload photo from device"
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePhotoChange}
              aria-label="Take a photo with camera"
            />
          </div>
        )}

        {/* Step 4 — Location */}
        {step === 4 && (
          <div className="step-content">
            <h2 className="step-title">Pin the exact location</h2>
            <p className="step-desc">Click on the map to mark where the issue is. If you skip this, we will use Ashta town center.</p>

            <div className="map-wrap">
              <MapContainer
                center={position || [ASHTA.lat, ASHTA.lng]}
                zoom={15}
                className="report-map"
                aria-label="Select issue location on map"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <PinPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>

            {position ? (
              <div className="location-status location-status--set">
                <MapPin size={14} strokeWidth={2.5} aria-hidden="true" />
                Location pinned: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPosition(null)}>
                  <X size={13} /> Clear
                </button>
              </div>
            ) : (
              <div className="location-status location-status--default">
                <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                No pin placed — will default to Ashta town center
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="step-content">
            <h2 className="step-title">Review your report</h2>
            <p className="step-desc">Please confirm the details below before submitting.</p>

            <div className="review-grid">
              <div className="review-row">
                <span className="review-key">Category</span>
                <span className="review-val" style={{ color: catObj?.color }}>
                  {catObj?.label[lang] || catObj?.label.en}
                </span>
              </div>
              <div className="review-row">
                <span className="review-key">Department</span>
                <span className="review-val">{catObj?.dept}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Title</span>
                <span className="review-val">{title}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Description</span>
                <span className="review-val review-val--desc">{desc}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Auto-detected Priority</span>
                <span className={'review-val review-priority review-priority--' + priority.toLowerCase()}>
                  {priority}
                </span>
              </div>
              <div className="review-row">
                <span className="review-key">Location</span>
                <span className="review-val">
                  {position
                    ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                    : 'Ashta town center (default)'}
                </span>
              </div>
              <div className="review-row">
                <span className="review-key">Photo</span>
                <span className="review-val">{photo ? 'Attached' : 'Not provided'}</span>
              </div>
            </div>

            {photo && (
              <img src={photo} alt="Attached issue photo" className="review-photo" />
            )}

            <div className="review-notice">
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              <span>Once submitted, this complaint will be sent to the <strong>{catObj?.dept}</strong> for review.</span>
            </div>
          </div>
        )}

        {/* ── Nav buttons ── */}
        <div className="step-nav">
          {step > 1 && (
            <button type="button" className="btn btn-outline" onClick={back}>
              <ChevronLeft size={15} strokeWidth={2.5} aria-hidden="true" /> Back
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {step < 5 ? (
              <>
                {step === 3 && (
                  <button type="button" className="btn btn-ghost" onClick={next} disabled={aiStatus === 'checking'}>
                    Skip this step
                  </button>
                )}
                {step === 4 && (
                  <button type="button" className="btn btn-ghost" onClick={next}>
                    Skip this step
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={next}
                  disabled={!canNext[step] || (step === 3 && aiStatus === 'checking')}
                >
                  Continue <ChevronRight size={15} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit}>
                <CheckCheck size={16} strokeWidth={2.5} aria-hidden="true" /> Submit Complaint
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
