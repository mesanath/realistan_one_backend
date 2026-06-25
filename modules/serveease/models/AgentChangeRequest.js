const mongoose = require('mongoose');

const agentChangeRequestSchema = new mongoose.Schema({
  bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  reason:      { type: String, required: true, trim: true, maxlength: 500 },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:  { type: Date, default: null },
  newAgentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
}, { timestamps: true });

agentChangeRequestSchema.index({ bookingId: 1 });
agentChangeRequestSchema.index({ status: 1, createdAt: -1 });
agentChangeRequestSchema.index({ customerId: 1 });

module.exports = mongoose.model('AgentChangeRequest', agentChangeRequestSchema);
