const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'otp_issued', 'otp_verified', 'otp_failed', 'otp_expired', 'otp_locked',
      'service_started', 'service_ended',
      'booking_created', 'booking_cancelled', 'booking_assigned',
      'agent_location_update', 'agent_status_change',
      'admin_action', 'payment_event', 'sos_triggered',
      'payment_captured', 'payment_signature_invalid', 'payment_captured_webhook',
      'dispute_created', 'dispute_resolved',
      'photo_uploaded',
    ],
    required: true,
  },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },  // customer or agent
  role: { type: String, enum: ['customer', 'agent', 'admin', 'system'], default: 'system' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },  // extra context
  ip: { type: String, default: null },
}, { timestamps: true });

auditLogSchema.index({ bookingId: 1 });
auditLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
