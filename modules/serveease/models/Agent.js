const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: ['aadhaar', 'pan', 'police_verification', 'photo'], required: true },
  url: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
});

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  profileImage: { type: String, default: null },
  bio: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  documents: [documentSchema],
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
  city: { type: String, required: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  backgroundVerified: { type: Boolean, default: false },
  bankDetails: {
    accountNo: { type: String, default: null },
    ifsc: { type: String, default: null },
    bankName: { type: String, default: null },
    upi: { type: String, default: null },
  },
  fcmToken: { type: String, default: null },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null }, // Web Push subscription object
  joinedAt: { type: Date, default: Date.now },
  leaves: [{
    date: { type: Date, required: true },
    reason: { type: String, default: '' },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  }],
  appType: { type: String, enum: ['realestate', 'serveease'], default: 'serveease', index: true },
}, { timestamps: true });

agentSchema.index({ city: 1, status: 1 });
agentSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

module.exports = mongoose.model('Agent', agentSchema);
