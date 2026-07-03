const mongoose = require('mongoose');

const ipEntrySchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    requestCount: { type: Number, default: 1 },
  },
  { _id: false },
);

const historyEntrySchema = new mongoose.Schema(
  {
    requestedAt: { type: Date, required: true },
    ip: { type: String, default: '' },
    windowCount: { type: Number, default: 1 },
  },
  { _id: false },
);

const fraudUserSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },

    // Cumulative OTP request counter + timing
    otpRequestCount: { type: Number, default: 0 },
    firstRequestAt: { type: Date, default: null },
    lastRequestAt: { type: Date, default: null },

    // Last 100 OTP requests — used for frequency analysis
    requestHistory: { type: [historyEntrySchema], default: [] },

    // Unique IPs this phone has sent OTP requests from
    ipAddresses: { type: [ipEntrySchema], default: [] },

    // Fraud / block flags
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: '' },
    flaggedAt: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    blockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

fraudUserSchema.index({ phone: 1 });
fraudUserSchema.index({ isFlagged: 1, flaggedAt: -1 });
fraudUserSchema.index({ isBlocked: 1 });

module.exports = mongoose.model('FraudUser', fraudUserSchema);
