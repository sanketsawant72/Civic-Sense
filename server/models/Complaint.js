import mongoose from 'mongoose';

// ── Sub-schema: timeline entry ───────────────────────────────────────────────
const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at:     { type: Number, required: true }, // Unix ms
    note:   { type: String, default: '' },
  },
  { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────────────
const complaintSchema = new mongoose.Schema(
  {
    // Human-readable complaint ID: CS-XXXXXX
    cid: {
      type: String, required: true, unique: true, index: true,
      match: /^CS-[A-Z0-9]{6}$/,
    },
    title: {
      type: String, required: true, trim: true,
      minlength: 5, maxlength: 120,
    },
    description: {
      type: String, required: true, trim: true,
      minlength: 10, maxlength: 1000,
    },
    category: {
      type: String, required: true,
      enum: ['pothole','garbage','drainage','water','streetlight','construction','other'],
    },
    status: {
      type: String, required: true,
      enum: ['Submitted','Under Review','Assigned','In Progress','Resolved','Rejected'],
      default: 'Submitted',
    },
    priority: {
      type: String, required: true,
      enum: ['Low','Medium','High','Critical'],
      default: 'Low',
    },
    lat:         { type: Number, required: true },
    lng:         { type: Number, required: true },
    photo:       { type: String, default: null }, // base64 data-URL or null
    submittedBy: { type: String, default: 'citizen' },
    submittedAt: { type: Number, required: true }, // Unix ms — set by client
    timeline:    { type: [timelineSchema], default: [] },
  },
  {
    timestamps: true,  // adds createdAt / updatedAt
    versionKey: false,
  }
);

// ── toJSON transform: expose `id` = cid, hide internal _id/cid ──────────────
complaintSchema.set('toJSON', {
  virtuals: false,
  transform(_doc, ret) {
    ret.id = ret.cid;
    delete ret._id;
    delete ret.cid;
    return ret;
  },
});

export default mongoose.model('Complaint', complaintSchema);
