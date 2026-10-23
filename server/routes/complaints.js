import { Router } from 'express';
import Complaint from '../models/Complaint.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();

function makeId() {
  return 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── GET /api/complaints  — role-filtered list ────────────────────────────────
router.get('/', protect, asyncHandler(async (req, res) => {
  const filter = {};
  const { role, departmentCategory, _id: userId } = req.user;

  // Department users see only their category
  if (role === 'department') {
    filter.category = departmentCategory;
  }

  // Citizens see only their own submissions
  if (role === 'citizen') {
    filter.submittedBy = userId.toString();
  }

  // Optional extra filters from query params (admin / dept)
  if (req.query.status   && role !== 'citizen') filter.status   = req.query.status;
  if (req.query.priority && role !== 'citizen') filter.priority = req.query.priority;
  if (req.query.category && role === 'admin')   filter.category = req.query.category;

  if (req.query.q) {
    const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: re }, { description: re }, { cid: re }];
  }

  const complaints = await Complaint.find(filter).sort({ submittedAt: -1 });
  res.json(complaints);
}));

// ── GET /api/complaints/:id ──────────────────────────────────────────────────
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const c = await Complaint.findOne({ cid: req.params.id });
  if (!c) return res.status(404).json({ error: 'Complaint not found' });

  // Citizens can only view their own
  if (req.user.role === 'citizen' && c.submittedBy !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Dept users can only view their category
  if (req.user.role === 'department' && c.category !== req.user.departmentCategory) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(c);
}));

// ── POST /api/complaints  — citizens only ────────────────────────────────────
router.post('/', protect, requireRole('citizen'), asyncHandler(async (req, res) => {
  const {
    title, description, category, priority,
    lat, lng, photo, submittedAt,
  } = req.body;

  const now = submittedAt || Date.now();
  const cid = makeId();

  const complaint = await Complaint.create({
    cid,
    title:       title?.trim(),
    description: description?.trim(),
    category,
    priority:    priority || 'Low',
    status:      'Submitted',
    lat, lng,
    photo:       photo || null,
    submittedBy: req.user._id.toString(),   // store real user ID
    submittedAt: now,
    timeline: [{ status: 'Submitted', at: now, note: 'Complaint registered.' }],
  });

  res.status(201).json(complaint);
}));

// ── PATCH /api/complaints/:id/status  — admin or dept only ──────────────────
router.patch('/:id/status', protect, requireRole('admin', 'department'),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const c = await Complaint.findOne({ cid: req.params.id });
    if (!c) return res.status(404).json({ error: 'Complaint not found' });

    // Dept users can only update their own category
    if (req.user.role === 'department' && c.category !== req.user.departmentCategory) {
      return res.status(403).json({ error: 'Access denied — not your department' });
    }

    c.status = status;
    c.timeline.push({
      status,
      at:   Date.now(),
      note: note?.trim() || `Status changed to ${status}.`,
    });
    await c.save();
    res.json(c);
  })
);

// ── PATCH /api/complaints/:id/priority  — admin or dept only ────────────────
router.patch('/:id/priority', protect, requireRole('admin', 'department'),
  asyncHandler(async (req, res) => {
    const { priority } = req.body;
    if (!priority) return res.status(400).json({ error: 'priority is required' });

    const c = await Complaint.findOne({ cid: req.params.id });
    if (!c) return res.status(404).json({ error: 'Complaint not found' });

    if (req.user.role === 'department' && c.category !== req.user.departmentCategory) {
      return res.status(403).json({ error: 'Access denied — not your department' });
    }

    const updated = await Complaint.findOneAndUpdate(
      { cid: req.params.id },
      { priority },
      { new: true, runValidators: true }
    );
    res.json(updated);
  })
);

// ── DELETE /api/complaints/:id  — admin only ─────────────────────────────────
router.delete('/:id', protect, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await Complaint.deleteOne({ cid: req.params.id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Complaint not found' });
  }
  res.json({ deleted: req.params.id });
}));

export default router;
