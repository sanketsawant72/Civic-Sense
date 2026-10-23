/**
 * /api/ai  — Proxy routes to the Python FastAPI AI service
 *
 * The frontend never calls the Python service directly.
 * All AI requests go through this Express proxy so:
 *   - Auth is enforced (citizens only for /classify)
 *   - The AI_SERVICE_URL stays server-side
 *   - Errors are normalised
 */

import { Router } from 'express';
import { protect } from '../middleware/auth.js';

const router = Router();
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── GET /api/ai/health ────────────────────────────────────────────────────────
// Returns AI service status — no auth required (used by AppShell banner)
router.get('/health', asyncHandler(async (_req, res) => {
  try {
    const r = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(4000) });
    const data = await r.json();
    res.json({ ok: data.ok === true, model: data.model || 'YOLOv8n' });
  } catch {
    res.json({ ok: false, model: null });
  }
}));

// ── POST /api/ai/classify ─────────────────────────────────────────────────────
// Accepts { image: "<base64>" } from an authenticated citizen
// Forwards to Python FastAPI, returns prediction result
router.post('/classify', protect, asyncHandler(async (req, res) => {
  const { image, filename } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'image (base64) is required' });
  }

  let aiRes;
  try {
    aiRes = await fetch(`${AI_URL}/classify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image, filename: filename || 'photo.jpg' }),
      signal:  AbortSignal.timeout(30_000), // 30 s — YOLO can be slow first run
    });
  } catch (err) {
    // AI service is down — return graceful fallback instead of crashing
    return res.status(503).json({
      error:      'AI service unavailable',
      fallback:   true,
      category:   'other',
      confidence: 0,
    });
  }

  if (!aiRes.ok) {
    const body = await aiRes.json().catch(() => ({}));
    return res.status(aiRes.status).json({
      error:    body.detail || 'AI classification failed',
      fallback: true,
    });
  }

  const result = await aiRes.json();
  res.json(result);
}));

export default router;
