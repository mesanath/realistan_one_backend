const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  units: { type: Number, default: 1, min: 1, max: 10 },
  unitPrice: { type: Number, required: true },   // price per unit at time of booking
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { _id: true });

const corporateBookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true },
  slots: [slotSchema],
  totalAmount: { type: Number, required: true },       // sum of slot prices × units before discount
  discountPercent: { type: Number, default: 0 },       // 10 / 15 / 20 based on slot count
  discountAmount: { type: Number, default: 0 },        // ₹ value of bulk discount
  gstAmount: { type: Number, default: 0 },             // 18% GST on final amount
  finalAmount: { type: Number, required: true },       // totalAmount − discountAmount + gstAmount
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentType: {
    type: String,
    enum: ['prepaid', 'credit', 'invoice'],
    default: 'prepaid',
  },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

corporateBookingSchema.index({ customer: 1, status: 1 });
corporateBookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CorporateBooking', corporateBookingSchema);
