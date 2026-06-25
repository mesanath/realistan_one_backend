const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },
  planType: { type: String, enum: ['home_basic', 'home_standard', 'home_premium', 'beauty_glow', 'beauty_full'] },
  price: { type: Number, required: true },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  servicesIncluded: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    count: Number,  // allowed uses per cycle
    used: { type: Number, default: 0 },
  }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  autoRenew: { type: Boolean, default: true },
  paymentId: String,
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
