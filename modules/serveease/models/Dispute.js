const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['service_not_completed', 'agent_no_show', 'quality_issue', 'wrong_charge', 'customer_abusive', 'customer_no_show', 'other'],
    required: true,
  },
  raisedByRole: { type: String, enum: ['customer', 'agent'], default: 'customer' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  description: { type: String, maxlength: 500, default: '' },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved_refund', 'resolved_no_refund', 'closed'],
    default: 'open',
  },
  refundAmount: { type: Number, default: 0 },
  adminNote: { type: String, default: '' },
  adminReply: { type: String, default: '' }, // Customer-visible reply from admin
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

disputeSchema.index({ customer: 1, status: 1 });
disputeSchema.index({ booking: 1, raisedByRole: 1 }, { unique: true }); // one dispute per booking per role

module.exports = mongoose.model('Dispute', disputeSchema);
