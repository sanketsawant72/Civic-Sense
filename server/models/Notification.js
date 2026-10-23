import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    toUserId:   { type: String, required: true, index: true }, // recipient user _id string
    fromRole:   { type: String, enum: ['admin', 'department', 'system'], default: 'system' },
    fromName:   { type: String, default: 'CivicSense' },
    complaintId: { type: String, default: null },  // cid like CS-XXXXXX
    title:      { type: String, required: true },
    message:    { type: String, required: true },
    type:       { type: String, enum: ['assigned','resolved','rejected','update','info'], default: 'info' },
    read:       { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('Notification', notificationSchema);
