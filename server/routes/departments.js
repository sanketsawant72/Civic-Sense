/**
 * /api/departments  — Admin-only CRUD for department user accounts.
 *
 * Admin creates one login per civic department (category).
 * Each dept user can then log in and see/update only their complaints.
 */
import { Router } from 'express';
import bcrypt      from 'bcryptjs';
import User        from '../models/User.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require a valid JWT + admin role
router.use(protect, requireRole('admin'));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── GET /api/departments  — list all department accounts ─────────────────────
router.get('/', asyncHandler(async (_req, res) => {
  const depts = await User.find({ role: 'department' })
    .select('-passwordHash')
    .sort({ departmentName: 1 });
  res.json(depts);
}));

// ── POST /api/departments  — create a new department login ───────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, departmentCategory, departmentName, phone } = req.body;

  if (!name || !email || !password || !departmentCategory || !departmentName) {
    return res.status(400).json({
      error: 'name, email, password, departmentCategory and departmentName are required',
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Check only one account per category
  const catTaken = await User.findOne({ role: 'department', departmentCategory });
  if (catTaken) {
    return res.status(409).json({
      error: `A department account for category "${departmentCategory}" already exists`,
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name:               name.trim(),
    email:              email.toLowerCase().trim(),
    passwordHash,
    role:               'department',
    departmentCategory,
    departmentName:     departmentName.trim(),
    phone:              phone?.trim() || null,
    active:             true,
  });

  res.status(201).json(user);
}));

// ── PATCH /api/departments/:id  — update name / email / password ─────────────
router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, email, password, phone, active } = req.body;

  const user = await User.findOne({ _id: req.params.id, role: 'department' });
  if (!user) return res.status(404).json({ error: 'Department account not found' });

  if (name)   user.name  = name.trim();
  if (phone !== undefined) user.phone = phone?.trim() || null;
  if (active !== undefined) user.active = Boolean(active);

  if (email) {
    const clash = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: user._id },
    });
    if (clash) return res.status(409).json({ error: 'Email already in use' });
    user.email = email.toLowerCase().trim();
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    user.passwordHash = await bcrypt.hash(password, 12);
  }

  await user.save();
  res.json(user);
}));

// ── DELETE /api/departments/:id  — permanently remove a dept account ─────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await User.deleteOne({ _id: req.params.id, role: 'department' });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Department account not found' });
  }
  res.json({ deleted: req.params.id });
}));

export default router;
