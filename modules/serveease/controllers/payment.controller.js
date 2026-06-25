const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');

// POST /api/v1/payments/create-order
// Customer calls this to get a Razorpay order before showing the checkout modal
exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    const order = await paymentService.createOrder({
      bookingId: booking._id,
      amountRupees: booking.finalAmount,
    });

    // Upsert by bookingId only — one payment record per booking.
    // Using status:'pending' in the filter would create a second null-webhookEventId
    // document on retry, which violates the sparse unique index even on some Mongo versions.
    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      {
        $set: {
          customerId: req.user.id,
          orderId: order.id,
          gateway: 'razorpay',
          amount: booking.finalAmount,
          currency: order.currency,
          status: 'pending',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    const msg = err?.message || err?.error?.description || 'Payment order creation failed';
    logger.error(`createOrder error: ${msg}`);
    res.status(err?.statusCode || 500).json({ success: false, message: msg });
  }
};

// POST /api/v1/payments/verify
// Client sends razorpay_order_id, razorpay_payment_id, razorpay_signature after checkout
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = paymentService.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      await AuditLog.create({ type: 'payment_signature_invalid', userId: req.user.id, meta: { orderId: razorpay_order_id } });
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        transactionId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'captured',
        capturedAt: new Date(),
      },
      { new: true }
    );

    if (payment) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'paid',
        paymentId: razorpay_payment_id,
      });
      await AuditLog.create({ type: 'payment_captured', bookingId: payment.bookingId, userId: req.user.id, meta: { paymentId: razorpay_payment_id } });
    }

    res.json({ success: true, message: 'Payment verified', transactionId: razorpay_payment_id });
  } catch (err) {
    const msg = err?.message || 'Payment verification failed';
    logger.error(`verifyPayment error: ${msg}`);
    res.status(500).json({ success: false, message: msg });
  }
};

// POST /api/v1/payments/webhook
// Razorpay calls this server-side for authoritative payment events
// Requires raw body — mount BEFORE express.json()
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).json({ success: false, message: 'Missing signature' });

    const isValid = paymentService.verifyWebhookSignature({ rawBody: req.rawBody, signature });
    if (!isValid) {
      logger.warn(`Razorpay webhook signature mismatch`);
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventId = event.id;

    // Idempotency: skip if already processed
    const existing = await Payment.findOne({ webhookEventId: eventId });
    if (existing) return res.json({ success: true, message: 'Already processed' });

    const payload = event.payload?.payment?.entity;
    if (!payload) return res.json({ success: true });

    const orderId = payload.order_id;
    const paymentId = payload.id;

    if (event.event === 'payment.captured') {
      await Payment.findOneAndUpdate(
        { orderId },
        { transactionId: paymentId, status: 'captured', capturedAt: new Date(), method: payload.method, bank: payload.bank || null, vpa: payload.vpa || null, webhookEventId: eventId },
        { new: true }
      );
      const payment = await Payment.findOne({ orderId });
      if (payment) {
        await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid', paymentId });
        await AuditLog.create({ type: 'payment_captured_webhook', bookingId: payment.bookingId, meta: { paymentId, eventId } });
      }
    } else if (event.event === 'payment.failed') {
      await Payment.findOneAndUpdate(
        { orderId },
        { status: 'failed', failureReason: payload.error_description || 'Payment failed', webhookEventId: eventId },
        { new: true }
      );
    } else if (event.event === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      if (refundEntity) {
        await Payment.findOneAndUpdate(
          { transactionId: refundEntity.payment_id, 'refunds.refundId': refundEntity.id },
          { $set: { 'refunds.$.status': 'processed', 'refunds.$.processedAt': new Date() } }
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    const msg = err?.message || 'Webhook processing failed';
    logger.error(`webhook error: ${msg}`);
    res.status(500).json({ success: false, message: msg });
  }
};

// GET /api/v1/payments/booking/:bookingId — customer gets their payment record
exports.getPaymentByBooking = async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId }).select('-signature -webhookEventId');
    if (!payment) return res.status(404).json({ success: false, message: 'No payment found' });
    if (payment.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
