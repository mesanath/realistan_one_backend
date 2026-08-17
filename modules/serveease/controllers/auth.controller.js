const User = require('../models/User');
const Agent = require('../models/Agent');

// OTP send/verify/refresh now live in src/auth/unifiedAuth.controller.js — the one
// login system shared with realestate (see /api/v1/auth/send-otp, /verify-otp,
// /refresh). What's left here is serveease-specific account/profile management.

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

// DELETE /api/v1/serveease/auth/account
exports.deleteAccount = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'agent') return res.status(403).json({ success: false, message: 'Not available for agents' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isDeleted) return res.status(400).json({ success: false, message: 'Account already deleted' });

    // Soft-delete + scrub PII. `phone` (unique, login identifier) and booking/wallet/loyalty
    // history are kept so past bookings and admin reporting still resolve correctly — only the
    // isDeleted flag blocks the phone number from logging back in (see verifyOtp above).
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    user.name = 'Deleted User';
    user.email = undefined;
    user.profileImage = null;
    user.addresses = [];
    user.fcmToken = null;
    user.pushSubscription = null;
    await user.save();

    return res.json({ success: true, message: 'Account deleted successfully' });
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
