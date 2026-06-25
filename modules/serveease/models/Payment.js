const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: { type: String, required: true },       // Razorpay refund ID
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  initiatedBy: { type: String, enum: ['customer', 'admin'], required: true },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Razorpay IDs
  orderId: { type: String, default: null },         // rzp_order_xxx
  transactionId: { type: String, default: null, index: true }, // rzp_pay_xxx
  signature: { type: String, default: null },       // HMAC signature for verification

  gateway: { type: String, enum: ['razorpay', 'cod', 'wallet'], required: true },
  amount: { type: Number, required: true },          // in paise (for Razorpay) or rupees for COD
  currency: { type: String, default: 'INR' },

  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true,
  },

  method: { type: String, default: null },          // card, upi, netbanking, wallet
  bank: { type: String, default: null },
  vpa: { type: String, default: null },             // UPI VPA

  refunds: [refundSchema],

  webhookEventId: { type: String },  // idempotency key from Razorpay webhook — no default so sparse index skips absent docs
  capturedAt: { type: Date, default: null },
  failureReason: { type: String, default: null },
}, { timestamps: true });

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ webhookEventId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
