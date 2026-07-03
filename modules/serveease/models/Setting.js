const mongoose = require('mongoose');

/**
 * Key-value settings store — one document per setting.
 * System settings (isSystem: true) are seeded automatically and cannot be deleted.
 * Admins can add arbitrary custom keys alongside the system ones.
 */
const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_]+$/, 'Key must contain only uppercase letters, digits, and underscores'],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    dataType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json'],
      default: 'string',
    },
    description: { type: String, default: '', trim: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

settingSchema.index({ key: 1 });
settingSchema.index({ isSystem: 1 });

module.exports = mongoose.model('Setting', settingSchema);
