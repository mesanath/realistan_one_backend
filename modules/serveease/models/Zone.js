const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  coordinates: [{           // polygon boundary points
    lat: Number,
    lng: Number,
  }],
  pricingMultiplier: { type: Number, default: 1.0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

zoneSchema.index({ city: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
