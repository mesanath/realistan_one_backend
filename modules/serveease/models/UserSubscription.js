const mongoose = require('mongoose');

const billingEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'failed'], required: true },
}, { _id: true });

const userSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active',
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },             // set to startDate + 30 days on creation
  bookingsUsed: { type: Number, default: 0 },
  autoRenew: { type: Boolean, default: true },
  billingHistory: [billingEntrySchema],
}, { timestamps: true });

userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });   // for expiry job

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
