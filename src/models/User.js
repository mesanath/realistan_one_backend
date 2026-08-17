'use strict';
/**
 * Single shared customer identity for the whole backend — realestate and serveease
 * no longer have separate accounts. One phone number, one OTP login, one profile.
 *
 * Was modules/serveease/models/User.js (serveease's richer schema — wallet, loyalty,
 * bookings, corporate — was kept as the base since it holds real production data).
 * modules/serveease/models/User.js now just re-exports this file so every existing
 * `require('../models/User')` in the serveease module keeps working unchanged.
 *
 * Fields below the `--- realestate ---` marker were added to carry over what the old
 * native-Mongo `userAccounts` collection tracked (see scripts/migrate-unify-users.js).
 */
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  addressLine: { type: String, required: true },
  landmark: String,
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  lat: Number,
  lng: Number,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const walletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  refId: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const loyaltyTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['earned', 'redeemed'], required: true },
  points: { type: Number, required: true },
  description: { type: String, required: true },
  refId: { type: String },  // bookingId reference
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Not `required` — social-only sign-ins (Google/Apple/Facebook) may not collect a phone
  // number. OTP/mobile login (the primary flow) always sets it. `sparse` lets any number of
  // docs have no phone without tripping the unique index.
  phone: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  age: { type: Number, min: 16, max: 100, default: null },
  profileImage: { type: String, default: null },
  addresses: [addressSchema],
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTransactions: [loyaltyTransactionSchema],
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [walletTransactionSchema],
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fcmToken: { type: String, default: null },
  pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null }, // Web Push subscription object
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  // Separate from isActive (which admins toggle to block customers) so a self-service
  // account deletion is unambiguous and can't be confused with / undone by an admin block-toggle.
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  totalBookings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  corporate: {
    isEnabled: { type: Boolean, default: false },
    companyName: { type: String, default: null },
    gstNumber: { type: String, default: null },
    billingAddress: { type: String, default: null },
    creditLimit: { type: Number, default: 0 },   // ₹ — how much they can book on credit
    creditUsed: { type: Number, default: 0 },
    invoiceEmail: { type: String, default: null },
    pendingApproval: { type: Boolean, default: false }, // set true on register, cleared when admin enables
  },
  // Informational only ("which product did they first sign up through") — no longer gates
  // identity or login now that there's one shared account for both products.
  appType: { type: String, enum: ['realestate', 'serveease'], default: 'serveease', index: true },

  // --- realestate ---
  screenName: { type: String, trim: true, default: null },
  savedProperties: { type: [String], default: [] }, // shortlisted propertyIDs
  whatsappFlag: { type: Boolean, default: false },
  loginType: { type: String, enum: ['mobile', 'social', 'truecaller'], default: 'mobile' },
  socialId: { type: String, default: null },
  socialIdType: { type: String, enum: ['googleId', 'appleId', 'facebookId', null], default: null },
  socialName: { type: String, default: null },
}, { timestamps: true });

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ socialId: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
