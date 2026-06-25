const User = require('../models/User');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

/**
 * POST /api/v1/notifications/subscribe
 * Saves the browser Web Push subscription object to the authenticated user or agent document.
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    const role = req.user.role;
    const userId = req.user.id;

    if (role === 'agent') {
      await Agent.findByIdAndUpdate(userId, { pushSubscription: subscription });
    } else if (role === 'customer') {
      await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    } else {
      // Admin role does not receive push notifications
      return res.status(403).json({ success: false, message: 'Push subscriptions are not supported for admins' });
    }

    logger.info(`[WebPush] Subscription saved for ${role} ${userId}`);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    logger.error(`[WebPush] subscribe error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/notifications/subscribe
 * Removes stored push subscription for the authenticated user/agent.
 */
exports.unsubscribe = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    if (role === 'agent') {
      await Agent.findByIdAndUpdate(userId, { pushSubscription: null });
    } else if (role === 'customer') {
      await User.findByIdAndUpdate(userId, { pushSubscription: null });
    }

    logger.info(`[WebPush] Subscription removed for ${role} ${userId}`);
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    logger.error(`[WebPush] unsubscribe error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};
