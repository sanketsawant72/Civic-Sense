import mongoose from 'mongoose';
import bcrypt    from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true, maxlength: 80 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'department', 'citizen'],
      default: 'citizen',
    },
    // Only set for role='department' — which category they manage
    departmentCategory: {
      type: String,
      enum: ['pothole','garbage','drainage','water','streetlight','construction','other', null],
      default: null,
    },
    // Human-readable department name (e.g. "Public Works Department")
    departmentName: { type: String, default: null },
    phone:  { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// ── Helpers ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash; // never expose the hash
    return ret;
  },
});

export default mongoose.model('User', userSchema);
