const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const otpSchema = new mongoose.Schema({
  code: { type: String, default: null },        // hashed OTP
  issuedAt: { type: Date, default: null },
  verifiedAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    unique: true,
    default: () => `SE-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`,
  },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  packageName: { type: String, default: null },  // selected package name
  address: {
    label: String,
    addressLine: { type: String, required: true },
    landmark: String,
    city: { type: String, required: true },
    pincode: String,
    lat: Number,
    lng: Number,
  },
  scheduledAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_agent'],
    default: 'pending',
  },
  startOtp: { type: otpSchema, default: () => ({}) },
  endOtp:   { type: otpSchema, default: () => ({}) },
  serviceStartedAt: { type: Date, default: null },
  serviceEndedAt:   { type: Date, default: null },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  couponCode: { type: String, default: null },
  surgeMultiplier: { type: Number, default: 1.0 },   // EN9 — 1.0 = no surge
  surgeLabel: { type: String, default: null },        // EN9 — e.g. 'Weekend surge'
  surgeAmount: { type: Number, default: 0 },          // EN9 — extra ₹ added by surge over base price
  baseAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  loyaltyPointsUsed: { type: Number, default: 0 },
  loyaltyDiscount: { type: Number, default: 0 },          // ₹ value of loyalty redemption (points * 0.5)
  subscriptionDiscount: { type: Number, default: 0 },     // ₹ value of subscription plan discount
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription', default: null },
  finalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['upi', 'card', 'cod', 'wallet'], default: 'cod' },
  paymentId: { type: String, default: null },    // Razorpay payment ID
  notes: { type: String, default: '' },
  cancelReason: { type: String, default: null },
  cancelledBy: { type: String, enum: ['customer', 'agent', 'admin'], default: null },
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },
  agentPhotos: {
    before: [{ url: String, uploadedAt: { type: Date, default: Date.now } }],
    after:  [{ url: String, uploadedAt: { type: Date, default: Date.now } }],
  }, // cleaning job photo proof (EN5)
  invoiceUrl: { type: String, default: null },
}, { timestamps: true });

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ agentId: 1, status: 1 });
bookingSchema.index({ scheduledAt: 1 });
bookingSchema.index({ bookingCode: 1 });
bookingSchema.index({ 'address.city': 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
