const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },                     // monthly price in ₹
  bookingsPerMonth: { type: Number, required: true },          // included bookings
  discountPercent: { type: Number, required: true, min: 0, max: 100 }, // % off each booking
  features: [{ type: String }],                                // bullet points shown in UI
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },                         // display order (lower = first)
}, { timestamps: true });

subscriptionPlanSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

/*
 * Seed plans (run once via mongo shell or seed script):
 *
 * ServeEase Lite  — ₹499/mo, 2 bookings, 10% off
 *   features: ["2 bookings/month", "10% discount on every booking", "Priority support"]
 *   order: 1
 *
 * ServeEase Pro   — ₹999/mo, 5 bookings, 20% off  (Most Popular)
 *   features: ["5 bookings/month", "20% discount on every booking", "Free rescheduling", "Priority support"]
 *   order: 2
 *
 * ServeEase Elite — ₹1999/mo, 12 bookings, 30% off
 *   features: ["12 bookings/month", "30% discount on every booking", "Free rescheduling", "Dedicated agent", "24/7 support"]
 *   order: 3
 */
