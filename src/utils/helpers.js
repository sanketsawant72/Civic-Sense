/**
 * Generate a human-readable complaint ID like CS-A3F9K2
 */
export function generateId() {
  return 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Format a timestamp as a locale date string.
 * @param {number} ts - Unix ms timestamp
 * @param {string} lang - 'en' | 'hi' | 'mr'
 */
export function formatDate(ts, lang = 'en') {
  const locale = lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'mr-IN';
  return new Date(ts).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a timestamp as relative time (e.g. "2 days ago").
 * @param {number} ts - Unix ms timestamp
 */
export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Read a File object as a base64 data URL.
 * Returns a Promise<string>.
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
