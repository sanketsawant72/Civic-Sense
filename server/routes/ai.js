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
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const AI_URL = (
  process.env.AI_SERVICE_URL?.trim()
  || (IS_PRODUCTION ? '' : 'http://localhost:49200')
).replace(/\/+$/, '');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function unavailableResponse(error, code) {
  return {
    ok: false,
    configured: Boolean(AI_URL),
    reachable: false,
    civicModelReady: false,
    error,
    code,
  };
}

function classificationFailure(status) {
  if (status === 400 || status === 422) {
    return 'The AI service rejected this image. Try a valid JPG or PNG photo.';
  }
  if (status === 413) {
    return 'The AI service rejected this image because it is too large. Try a smaller photo.';
  }
  if (status === 429) {
    return 'The AI service is temporarily rate-limited. Wait a moment and try again.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return `The AI service is temporarily unavailable (HTTP ${status}). Check its deployment and logs, then try again.`;
  }
  if (status >= 500) {
    return `The AI service failed while classifying this image (HTTP ${status}). Check the Python service logs for the inference error.`;
  }
  return `The AI service rejected the classification request (HTTP ${status}).`;
}

// ── GET /api/ai/health ────────────────────────────────────────────────────────
// Returns AI service status — no auth required (used by AppShell banner)
router.get('/health', asyncHandler(async (_req, res) => {
  if (!AI_URL) {
    return res.status(503).json(unavailableResponse(
      'AI_SERVICE_URL is not configured on the API server.',
      'AI_SERVICE_NOT_CONFIGURED'
    ));
  }

  try {
    const r = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) {
      return res.status(503).json(unavailableResponse(
        `AI service health check failed with HTTP ${r.status}.`,
        'AI_SERVICE_HEALTH_FAILED'
      ));
    }
    const data = await r.json();
    return res.json({
      ok: data.ok === true,
      configured: true,
      reachable: true,
      model: data.model || null,
      civicModelReady: data.civic_model_ready === true || data.gemini_ready === true,
      warning: data.warning || null,
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    return res.status(503).json(unavailableResponse(
      timedOut
        ? 'AI service did not respond within 4 seconds. Check whether it is running or waking from sleep.'
        : 'Could not connect to the AI service. Check the API server AI_SERVICE_URL and AI service deployment.',
      timedOut ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNREACHABLE'
    ));
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

  if (!AI_URL) {
    return res.status(503).json({
      ...unavailableResponse(
        'AI_SERVICE_URL is not configured on the API server.',
        'AI_SERVICE_NOT_CONFIGURED'
      ),
      fallback: true,
    });
  }

  let aiRes;
  try {
    aiRes = await fetch(`${AI_URL}/classify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image, filename: filename || 'photo.jpg' }),
      signal:  AbortSignal.timeout(90_000), // Allow cold-starting AI instances time to wake.
    });
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    return res.status(503).json({
      ...unavailableResponse(
        timedOut
          ? 'AI classification timed out after 90 seconds. Check the AI service logs, available memory, and model startup.'
          : 'Could not connect to the AI service. Check the API server AI_SERVICE_URL and AI service deployment.',
        timedOut ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNREACHABLE'
      ),
      fallback: true,
    });
  }

  if (!aiRes.ok) {
    const error = classificationFailure(aiRes.status);
    console.error(`[AI proxy] Classification failed with HTTP ${aiRes.status}.`);
    return res.status(aiRes.status).json({
      error,
      code:     'AI_CLASSIFICATION_FAILED',
      upstreamStatus: aiRes.status,
      fallback: true,
    });
  }

  const result = await aiRes.json();
  if (result.civic_model_ready !== true && result.ai_powered !== true) {
    result.warning = result.warning
      || 'The service is using general-purpose model weights, not a civic-issue-trained model.';
  }
  res.json(result);
}));

export default router;
