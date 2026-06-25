const crypto = require('node:crypto');
const Razorpay = require('razorpay');
const logger = require('../utils/logger');

let razorpayClient = null;

// Razorpay SDK throws plain objects on API errors — normalise to Error instances
function normalizeRazorpayError(err) {
  if (err instanceof Error) return err;
  const description = err?.error?.description || err?.description || 'Unknown Razorpay error';
  const code = err?.error?.code || err?.statusCode || 'RAZORPAY_ERROR';
  const out = new Error(`Razorpay [${code}]: ${description}`);
  out.statusCode = err?.statusCode || 500;
  return out;
}

function getRazorpay() {
  if (!razorpayClient) {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    const isPlaceholder = (v) => !v || v.startsWith('your_') || v.includes('placeholder');
    if (isPlaceholder(RAZORPAY_KEY_ID) || isPlaceholder(RAZORPAY_KEY_SECRET)) {
      throw new Error(
        'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env'
      );
    }
    razorpayClient = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
  return razorpayClient;
}

/**
 * Create a Razorpay order for the given booking.
 * @param {{ bookingId: string, amountRupees: number, currency?: string, receipt?: string }} opts
 * @returns Razorpay order object
 */
async function createOrder({ bookingId, amountRupees, currency = 'INR', receipt }) {
  const rzp = getRazorpay();
  const amountPaise = Math.round(amountRupees * 100);
  if (amountPaise < 100) {
    throw new Error(`Order amount too low: ₹${amountRupees}. Minimum chargeable amount is ₹1.`);
  }
  try {
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || `se_${bookingId}`.slice(0, 40),
      notes: { bookingId: String(bookingId) },
    });
    logger.info(`Razorpay order created orderId=${order.id} bookingId=${bookingId}`);
    return order;
  } catch (err) {
    throw normalizeRazorpayError(err);
  }
}

/**
 * Verify Razorpay webhook or client-side payment signature.
 * @param {{ orderId: string, paymentId: string, signature: string }} params
 */
function verifySignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set');
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}

/**
 * Verify Razorpay webhook signature (different format: raw body + header).
 * @param {{ rawBody: Buffer|string, signature: string }} params
 */
function verifyWebhookSignature({ rawBody, signature }) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET not set');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

/**
 * Issue a refund against a captured payment.
 * @param {{ paymentId: string, amountRupees: number, notes?: object }} opts
 */
async function createRefund({ paymentId, amountRupees, notes = {} }) {
  const rzp = getRazorpay();
  try {
    const refund = await rzp.payments.refund(paymentId, {
      amount: Math.round(amountRupees * 100),
      notes,
    });
    logger.info(`Razorpay refund initiated refundId=${refund.id} paymentId=${paymentId}`);
    return refund;
  } catch (err) {
    throw normalizeRazorpayError(err);
  }
}

module.exports = { createOrder, verifySignature, verifyWebhookSignature, createRefund };
