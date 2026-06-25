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
  phone: { type: String, required: true, unique: true, trim: true },
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
  appType: { type: String, enum: ['realestate', 'serveease'], default: 'serveease', index: true },
}, { timestamps: true });

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
