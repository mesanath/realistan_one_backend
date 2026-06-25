const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  icon: { type: String, default: null },       // emoji or icon name
  image: { type: String, default: null },      // S3 URL
  color: { type: String, default: '#6366F1' }, // brand color per category
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  serviceCount: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
