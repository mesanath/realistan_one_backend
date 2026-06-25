const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 500 },
  photos: [String],
  tip: { type: Number, default: 0 },
  tags: [{ type: String, enum: ['punctual', 'professional', 'clean_work', 'friendly', 'expert'] }],
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

reviewSchema.index({ agentId: 1 });
reviewSchema.index({ serviceId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
