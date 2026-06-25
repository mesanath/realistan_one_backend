const mongoose = require('mongoose');

const cityPricingSchema = new mongoose.Schema({
  city: { type: String, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },       // Basic / Standard / Premium
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  includes: [String],
  isPopular: { type: Boolean, default: false },
});

const serviceSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  images: [String],                              // S3 URLs
  basePrice: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  whatIsIncluded: [String],
  whatIsNotIncluded: [String],
  packages: [packageSchema],
  cityPricing: [cityPricingSchema],
  tags: [String],
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

serviceSchema.index({ categoryId: 1, isActive: 1 });
serviceSchema.index({ slug: 1 });
serviceSchema.index({ isFeatured: 1, isPopular: 1 });
serviceSchema.index({ tags: 1 });

// Get price for a specific city (falls back to basePrice)
serviceSchema.methods.getPriceForCity = function (city) {
  const cityPrice = this.cityPricing.find((c) => c.city.toLowerCase() === city.toLowerCase());
  return cityPrice ? cityPrice.price : this.basePrice;
};

module.exports = mongoose.model('Service', serviceSchema);
