import { Router }   from 'express';
import rateLimit    from 'express-rate-limit';
import bcrypt       from 'bcryptjs';
import User         from '../models/User.js';
import { signToken, protect } from '../middleware/auth.js';

const router = Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Rate limiter — 10 attempts per 15 min per IP ─────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts — please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.json({ token, user });
}));

// ── POST /api/auth/register  (citizen self-registration) ─────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name:  name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role:  'citizen',
    phone: phone?.trim() || null,
  });

  const token = signToken(user);
  res.status(201).json({ token, user });
}));

// ── GET /api/auth/me  (returns current user from token) ──────────────────────
router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

// ── POST /api/auth/logout  (client-side — just confirms receipt) ─────────────
router.post('/logout', protect, (_req, res) => {
  // JWT is stateless — actual logout is done by the client deleting the token.
  // This endpoint lets the client confirm and we could blacklist tokens here later.
  res.json({ ok: true });
});

export default router;
