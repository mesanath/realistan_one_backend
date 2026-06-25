const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');

// GET /api/v1/coupons — public list of active coupons
exports.getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).select('code description type value maxDiscount minOrderValue validUntil applicableCities');
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/coupons/validate — validate a coupon code before booking (auth required)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, baseAmount } = req.body;
    if (!code || baseAmount == null) {
      return res.status(400).json({ success: false, message: 'code and baseAmount are required' });
    }

    const now = new Date();
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    // Flash deal window check — active only within flashStartAt → flashEndAt
    if (coupon.isFlashDeal) {
      if (!coupon.flashStartAt || !coupon.flashEndAt || now < coupon.flashStartAt || now > coupon.flashEndAt) {
        return res.status(400).json({ success: false, message: 'This flash deal has expired or not started yet.' });
      }
    }
    if (Number(baseAmount) < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
      });
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached' });
    }

    // Check per-user usage limit
    const userId = req.user.id;
    const userUsageCount = await Booking.countDocuments({
      customerId: userId,
      couponCode: coupon.code,
      status: { $ne: 'cancelled' },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      return res.status(400).json({ success: false, message: 'You have already used this coupon' });
    }

    // First-booking-only restriction
    if (coupon.isFirstBookingOnly) {
      const bookingCount = await Booking.countDocuments({
        customerId: userId,
        status: { $nin: ['cancelled'] },
      });
      if (bookingCount > 0) {
        return res.status(400).json({ success: false, message: 'This coupon is valid for first-time bookings only' });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    const amt = Number(baseAmount);
    if (coupon.type === 'flat') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'percent') {
      discountAmount = Math.round((coupon.value / 100) * amt);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else if (coupon.type === 'free_service') {
      discountAmount = amt;
    }
    discountAmount = Math.min(discountAmount, amt);

    res.json({
      success: true,
      data: {
        coupon: { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value },
        discountAmount,
        finalAmount: Math.max(0, amt - discountAmount),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/coupons/flash — public, returns currently active flash deals
exports.getFlashDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await Coupon.find({
      isFlashDeal: true,
      isActive: true,
      flashStartAt: { $lte: now },
      flashEndAt: { $gte: now },
    }).select('_id code type value discountType discountValue flashStartAt flashEndAt description minOrderValue originalPrice maxDiscount');
    res.json({ success: true, data: deals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
