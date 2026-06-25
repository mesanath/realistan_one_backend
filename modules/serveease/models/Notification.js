const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  // role tells us which collection userId points to (User vs Agent)
  userRole: { type: String, enum: ['customer', 'agent', 'admin'], required: true },

  type: {
    type: String,
    enum: [
      'booking_confirmed', 'booking_assigned', 'agent_en_route', 'agent_arrived',
      'service_started', 'service_completed', 'booking_cancelled',
      'otp_start', 'otp_end',
      'payment_received', 'refund_processed',
      'review_prompt', 'promo_offer', 'general',
    ],
    required: true,
  },

  channel: { type: String, enum: ['push', 'sms', 'email', 'in_app'], required: true },

  title: { type: String, default: '' },
  body: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra data for deep-link

  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  failureReason: { type: String, default: null },

  sentAt: { type: Date, default: null },
  readAt: { type: Date, default: null },     // for in_app / push only
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
