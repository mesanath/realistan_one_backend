const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');

// ─── GET /api/v1/subscriptions/plans  (public) ───────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/v1/subscriptions  (auth customer) ─────────────────────────────
exports.subscribe = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required' });
    }

    const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    // One active subscription per user
    const existing = await UserSubscription.findOne({ user: userId, status: 'active' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Cancel it before subscribing to a new plan.',
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    const subscription = await UserSubscription.create({
      user: userId,
      plan: plan._id,
      status: 'active',
      startDate,
      endDate,
      bookingsUsed: 0,
      autoRenew: true,
      billingHistory: [{ date: startDate, amount: plan.price, status: 'paid' }],
    });

    const populated = await UserSubscription.findById(subscription._id).populate('plan');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/subscriptions/mine  (auth customer) ─────────────────────────
exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user.id,
      status: 'active',
    }).populate('plan');

    if (!subscription) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/v1/subscriptions/mine/cancel  (auth customer) ────────────────
exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user.id,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No active subscription found' });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    res.json({ success: true, message: 'Subscription cancelled successfully', data: subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/admin/subscriptions  (admin) ────────────────────────────────
exports.getAdminSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 25, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, total] = await Promise.all([
      UserSubscription.find(filter)
        .populate('user', 'name phone email')
        .populate('plan', 'name price bookingsPerMonth discountPercent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UserSubscription.countDocuments(filter),
    ]);

    // MRR = sum of plan prices for all active subscriptions
    const activeCount = await UserSubscription.countDocuments({ status: 'active' });
    const mrrResult = await UserSubscription.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'subscriptionplans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $unwind: '$planDoc' },
      { $group: { _id: null, mrr: { $sum: '$planDoc.price' } } },
    ]);
    const mrr = mrrResult[0]?.mrr || 0;

    const cancelledCount = await UserSubscription.countDocuments({ status: 'cancelled' });
    const expiredCount = await UserSubscription.countDocuments({ status: 'expired' });

    res.json({
      success: true,
      data: subscriptions,
      stats: { total, active: activeCount, cancelled: cancelledCount, expired: expiredCount, mrr },
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
