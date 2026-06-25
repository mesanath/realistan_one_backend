const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['flat', 'percent', 'free_service'], required: true },
  value: { type: Number, required: true },        // Amount or % or 0 for free
  maxDiscount: { type: Number, default: null },    // Cap for percent type
  minOrderValue: { type: Number, default: 0 },
  maxUses: { type: Number, default: null },        // null = unlimited
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  isFirstBookingOnly: { type: Boolean, default: false },
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  applicableCities: [String],
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },

  // Flash deal fields
  isFlashDeal: { type: Boolean, default: false },
  flashStartAt: { type: Date, default: null },   // when the deal goes live
  flashEndAt: { type: Date, default: null },     // when the deal expires
  originalPrice: { type: Number, default: null }, // for "was ₹X" strikethrough display
}, { timestamps: true });

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ isFlashDeal: 1, flashStartAt: 1, flashEndAt: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
