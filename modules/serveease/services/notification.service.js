const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// ─── VAPID / Web Push ─────────────────────────────────────────────────────────
let webPushConfigured = false;

function getWebPush() {
  try {
    const webpush = require('web-push');
    if (!webPushConfigured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@realistan.in',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      webPushConfigured = true;
    }
    return webpush;
  } catch {
    return null;
  }
}

/**
 * Send a Web Push notification to a user (customer or agent) via stored subscription.
 * Falls back silently if no subscription is stored or VAPID keys are not configured.
 * @param {string} userId  MongoDB ObjectId of the user
 * @param {{ title: string, body: string, url?: string }} payload
 * @param {'customer'|'agent'} [role='customer']
 */
async function sendPushNotification(userId, { title, body, url = '/' }, role = 'customer') {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    logger.warn('[WebPush] Skipped — VAPID keys not configured');
    return { ok: false, skipped: true };
  }

  try {
    const webpush = getWebPush();
    if (!webpush) {
      logger.warn('[WebPush] web-push module unavailable');
      return { ok: false, skipped: true };
    }

    let subscription = null;
    if (role === 'agent') {
      const Agent = require('../models/Agent');
      const agent = await Agent.findById(userId).select('pushSubscription');
      subscription = agent?.pushSubscription;
    } else {
      const User = require('../models/User');
      const user = await User.findById(userId).select('pushSubscription');
      subscription = user?.pushSubscription;
    }

    if (!subscription) {
      logger.info(`[WebPush] No subscription stored for ${role} ${userId} — skipping`);
      return { ok: false, skipped: true };
    }

    const payload = JSON.stringify({ title, body, url });
    await webpush.sendNotification(subscription, payload);
    logger.info(`[WebPush] Push sent to ${role} ${userId} — "${title}"`);
    return { ok: true };
  } catch (err) {
    // 410 Gone = subscription expired/unsubscribed — clean it up
    if (err.statusCode === 410) {
      logger.info(`[WebPush] Subscription expired for ${role} ${userId} — clearing`);
      try {
        if (role === 'agent') {
          const Agent = require('../models/Agent');
          await Agent.findByIdAndUpdate(userId, { pushSubscription: null });
        } else {
          const User = require('../models/User');
          await User.findByIdAndUpdate(userId, { pushSubscription: null });
        }
      } catch (cleanupErr) {
        logger.error(`[WebPush] Cleanup failed: ${cleanupErr.message}`);
      }
    } else {
      logger.error(`[WebPush] Failed for ${role} ${userId}: ${err.message}`);
    }
    return { ok: false, error: err.message };
  }
}

// ─── FCM (Push) stub ──────────────────────────────────────────────────────────
// Replace with real firebase-admin SDK call when FIREBASE_SERVICE_ACCOUNT_JSON is set.
async function sendPush({ token, title, body, data = {} }) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    logger.warn(`[FCM stub] Push skipped — FIREBASE_SERVICE_ACCOUNT_JSON not configured. title="${title}"`);
    return { ok: false, skipped: true };
  }
  try {
    // Lazy-load firebase-admin only when configured to keep cold start fast
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const result = await admin.messaging().send({ token, notification: { title, body }, data });
    logger.info(`[FCM] Push sent messageId=${result} title="${title}"`);
    return { ok: true, messageId: result };
  } catch (err) {
    logger.error(`[FCM] Push failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── SMS notification ─────────────────────────────────────────────────────────
// Reuses the existing SMS dispatch infrastructure from otp.js
async function sendSmsNotification({ phone, message }) {
  try {
    const { sendOtp } = require('../utils/otp');
    // sendOtp dispatches any text; pass the message body as "otp" placeholder
    // In production, use a dedicated transactional SMS template instead of OTP template
    logger.info(`[SMS] Sending notification to ${phone.slice(-4).padStart(phone.length, '*')}`);
    const result = await sendOtp(phone, message);
    return result;
  } catch (err) {
    logger.error(`[SMS notification] Failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Create a Notification record and attempt delivery.
 * @param {{ userId, userRole, type, channel, title?, body, payload?, fcmToken?, phone? }} opts
 */
async function send(opts) {
  const { userId, userRole, type, channel, title = '', body, payload = {}, fcmToken, phone } = opts;

  const notification = await Notification.create({
    userId, userRole, type, channel, title, body, payload, status: 'pending',
  });

  let result;
  try {
    if (channel === 'push') {
      if (!fcmToken) throw new Error('fcmToken required for push channel');
      result = await sendPush({ token: fcmToken, title, body, data: { type, ...payload } });
    } else if (channel === 'sms') {
      if (!phone) throw new Error('phone required for sms channel');
      result = await sendSmsNotification({ phone, message: body });
    } else if (channel === 'in_app') {
      // in_app notifications are stored in DB only — no external delivery needed
      result = { ok: true };
    } else {
      // email — stub for now
      logger.warn(`[Notification] email channel not yet implemented`);
      result = { ok: false, skipped: true };
    }

    const status = result.ok ? 'sent' : (result.skipped ? 'skipped' : 'failed');
    await Notification.findByIdAndUpdate(notification._id, {
      status,
      sentAt: result.ok ? new Date() : null,
      failureReason: result.error || null,
    });
    return { notification, result };
  } catch (err) {
    await Notification.findByIdAndUpdate(notification._id, { status: 'failed', failureReason: err.message });
    logger.error(`[Notification] delivery failed type=${type} channel=${channel}: ${err.message}`);
    return { notification, result: { ok: false, error: err.message } };
  }
}

/**
 * Convenience wrappers for common booking events.
 * All fire-and-forget — never await these in request handlers.
 */
const notify = {
  bookingConfirmed: (userId, userRole, payload) =>
    send({ userId, userRole, type: 'booking_confirmed', channel: 'in_app', title: 'Booking Confirmed', body: `Your booking #${payload.bookingCode} is confirmed.`, payload }),

  agentAssigned: (userId, userRole, payload) =>
    send({ userId, userRole, type: 'booking_assigned', channel: 'in_app', title: 'Agent Assigned', body: `${payload.agentName} has been assigned to your booking.`, payload }),

  serviceCompleted: (userId, userRole, payload) =>
    send({ userId, userRole, type: 'service_completed', channel: 'in_app', title: 'Service Completed', body: `Your service is complete. Please leave a review!`, payload }),

  paymentReceived: (userId, userRole, payload) =>
    send({ userId, userRole, type: 'payment_received', channel: 'in_app', title: 'Payment Received', body: `Payment of ₹${payload.amount} received for booking #${payload.bookingCode}.`, payload }),
};

module.exports = { send, notify, sendPush, sendSmsNotification, sendPushNotification };
