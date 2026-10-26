/**
 * CivicSense API client
 * - Automatically attaches JWT from useAuthStore to every request
 * - On 401, clears auth so the app redirects to /login
 */
import { useAuthStore } from '../store/useAuthStore';

const BASE = (import.meta.env.VITE_API_BASE || '') + '/api';

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(path, options = {}) {
  // Grab the token at call-time (store may have updated since module loaded)
  const token = useAuthStore.getState().token;

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // 204 No Content
  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Token expired or invalid — force logout
    useAuthStore.getState().clearAuth();
    throw new Error(body?.error || 'Session expired — please log in again');
  }

  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);

  return body;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function loginApi(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body:   JSON.stringify({ email, password }),
  });
}

export function registerApi(name, email, password, phone) {
  return request('/auth/register', {
    method: 'POST',
    body:   JSON.stringify({ name, email, password, phone }),
  });
}

export function logoutApi() {
  return request('/auth/logout', { method: 'POST' });
}

export function getMeApi() {
  return request('/auth/me');
}

// ── Complaints ────────────────────────────────────────────────────────────────
export function fetchComplaints(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return request(`/complaints${qs ? `?${qs}` : ''}`);
}

export function fetchComplaint(id) {
  return request(`/complaints/${encodeURIComponent(id)}`);
}

export function createComplaint(payload) {
  return request('/complaints', { method: 'POST', body: JSON.stringify(payload) });
}

export function checkDuplicateComplaints(payload) {
  return request('/complaints/duplicates/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchStatus(id, status, note = '') {
  return request(`/complaints/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, note }),
  });
}

export function patchPriority(id, priority) {
  return request(`/complaints/${encodeURIComponent(id)}/priority`, {
    method: 'PATCH',
    body:   JSON.stringify({ priority }),
  });
}

export function deleteComplaint(id) {
  return request(`/complaints/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Departments (admin only) ──────────────────────────────────────────────────
export function fetchDepartments() {
  return request('/departments');
}

export function createDepartment(payload) {
  return request('/departments', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateDepartment(id, payload) {
  return request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteDepartment(id) {
  return request(`/departments/${id}`, { method: 'DELETE' });
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const data = await fetch(`${BASE}/health`).then((r) => r.json());
    return data?.ok === true && data?.db === 'connected';
  } catch {
    return false;
  }
}

// ── AI Classification ─────────────────────────────────────────────────────────

/**
 * Send a base64 image to the YOLOv8 classifier via the Express proxy.
 * Returns the full classification result or a fallback object if AI is offline.
 *
 * @param {string} base64Image  - data URL or raw base64 string
 * @param {string} [filename]   - optional filename hint
 * @returns {Promise<{
 *   category: string,
 *   category_label: string,
 *   confidence: number,
 *   top_label: string,
 *   detected_objects: Array,
 *   ai_powered: boolean,
 *   fallback?: boolean
 * }>}
 */
export async function classifyImage(base64Image, filename = 'photo.jpg') {
  try {
    const result = await request('/ai/classify', {
      method: 'POST',
      body:   JSON.stringify({ image: base64Image, filename }),
    });
    return result;
  } catch (err) {
    // If AI service is down return a graceful fallback — never block the form
    return {
      category:         'other',
      category_label:   'Could not classify',
      confidence:       0,
      top_label:        '',
      detected_objects: [],
      ai_powered:       false,
      fallback:         true,
      error:            err.message,
    };
  }
}

/**
 * Check whether the AI service is online.
 * Resolves to true/false without throwing.
 */
export async function checkAiHealth() {
  try {
    const data = await fetch(`${BASE}/ai/health`).then((r) => r.json());
    return data?.ok === true;
  } catch {
    return false;
  }
}
