const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const redis = require('../config/redis');
const { generateOtp } = require('../utils/generateOtp');
const { sendOtp: dispatchOtpSms, parseMobile, maskMobile } = require('../utils/otp');
const logger = require('../utils/logger');

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600');
const DEV_MODE = process.env.OTP_DEV_MODE === 'true';

const signTokens = (payload) => {
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '1d' });
  const refresh = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' });
  return { access, refresh };
};

// POST /api/v1/auth/send-otp
exports.sendOtp = async (req, res) => {
  try {
    // Accept `mobile` (unified canonical) or `phone` (legacy direct calls)
    const rawPhone = req.body.mobile || req.body.phone;
    if (!rawPhone) return res.status(400).json({ success: false, message: 'mobile number required' });

    let phone;
    try {
      phone = parseMobile(rawPhone).normalized;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const otp = generateOtp(6);
    await redis.set(`auth_otp:${phone}`, otp, OTP_EXPIRY);

    if (DEV_MODE) {
      logger.info(`[DEV AUTH OTP] ${maskMobile(phone)} → ${otp}`);
    } else {
      const result = await dispatchOtpSms(phone, otp);
      if (!result.ok) {
        logger.error(`Auth OTP delivery failed mobile=${maskMobile(phone)} errors=${JSON.stringify(result.errors)}`);
        return res.status(502).json({ success: false, message: 'Failed to send OTP. Please try again.' });
      }
    }

    res.json({ success: true, message: 'OTP sent', ...(DEV_MODE && { devOtp: otp }) });
  } catch (err) {
    logger.error(`sendOtp error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    // Accept `mobile` (unified canonical) or `phone` (legacy direct calls)
    const rawPhone = req.body.mobile || req.body.phone;
    const { otp, role = 'customer', name, appType } = req.body;
    if (!rawPhone || !otp) return res.status(400).json({ success: false, message: 'mobile and OTP required' });

    let phone;
    try {
      phone = parseMobile(rawPhone).normalized;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const stored = await redis.get(`auth_otp:${phone}`);
    if (!stored || stored !== otp) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }
    await redis.del(`auth_otp:${phone}`);

    let user, isNew = false;
    if (role === 'agent') {
      user = await Agent.findOne({ phone });
      if (!user) {
        user = await Agent.create({ phone, name: name || 'Agent', city: 'Bangalore', gender: 'male', ...(appType && { appType }) });
        isNew = true;
      } else if (appType && !user.appType) {
        await Agent.updateOne({ _id: user._id }, { $set: { appType } });
      }
    } else if (role === 'admin') {
      user = await User.findOne({ phone, isAdmin: true });
      if (!user) return res.status(403).json({ success: false, message: 'Admin access denied for this number' });
    } else {
      user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ phone, name: name || 'User', ...(appType && { appType }) });
        isNew = true;
      } else if (appType && !user.appType) {
        await User.updateOne({ _id: user._id }, { $set: { appType } });
      }
    }

    const tokens = signTokens({ id: user._id, phone, role });
    res.json({ success: true, isNew, tokens, user: { _id: user._id, name: user.name, phone, role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const tokens = signTokens({ id: decoded.id, phone: decoded.phone, role: decoded.role });
    res.json({ success: true, tokens });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = role === 'agent' ? Agent : User;
    const query = Model.findById(id).select('-__v');
    if (role !== 'agent') query.populate('favorites', 'name slug basePrice durationMinutes categoryId');
    const user = await query;
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { ...user.toObject(), role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/auth/loyalty
exports.getLoyalty = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const user = await User.findById(id).select('loyaltyPoints loyaltyTransactions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const points = user.loyaltyPoints ?? 0;
    const pointsValue = parseFloat((points * 0.5).toFixed(2)); // 1 point = ₹0.50
    const transactions = (user.loyaltyTransactions ?? []).slice().reverse().slice(0, 20);

    res.json({ success: true, data: { points, pointsValue, transactions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const allowed = ['name', 'email', 'age', 'profileImage'];
    const updates = {};
    allowed.forEach((field) => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).select('-__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { ...user.toObject(), role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/auth/favorites/:serviceId  — toggle favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const { serviceId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const idx = user.favorites.indexOf(serviceId);
    let added;
    if (idx === -1) {
      user.favorites.push(serviceId);
      added = true;
    } else {
      user.favorites.splice(idx, 1);
      added = false;
    }
    await user.save();
    res.json({ success: true, added, favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/auth/addresses — add a new address
exports.addAddress = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const { label, addressLine, landmark, city, pincode, lat, lng, isDefault } = req.body;
    if (!addressLine || !city || !pincode) {
      return res.status(400).json({ success: false, message: 'addressLine, city and pincode are required' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (isDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }
    const first = user.addresses.length === 0;
    user.addresses.push({ label: label || 'Home', addressLine, landmark: landmark || '', city, pincode, lat, lng, isDefault: isDefault || first });
    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/auth/addresses/:addressId — remove a saved address
exports.removeAddress = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.addresses.length;
    user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId);
    if (user.addresses.length === before) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    // Ensure at least one default if addresses remain
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/auth/addresses/:addressId/default — set as default address
exports.setDefaultAddress = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let found = false;
    user.addresses.forEach((a) => {
      a.isDefault = a._id.toString() === req.params.addressId;
      if (a.isDefault) found = true;
    });
    if (!found) return res.status(404).json({ success: false, message: 'Address not found' });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
