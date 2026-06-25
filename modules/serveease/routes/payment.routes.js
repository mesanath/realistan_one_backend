const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { createPaymentOrderRules, verifyPaymentRules } = require('../validators/validators');

// Webhook must receive raw body for signature verification.
// We attach raw body via a custom verify callback before json parsing.
router.post(
  '/webhook',
  express_raw_body,
  ctrl.webhook
);

// All other routes require auth
router.use(authenticate);

router.post('/create-order', authorize('customer', 'admin'), createPaymentOrderRules, ctrl.createOrder);
router.post('/verify', authorize('customer', 'admin'), verifyPaymentRules, ctrl.verifyPayment);
router.get('/booking/:bookingId', ctrl.getPaymentByBooking);

// Middleware: captures raw body into req.rawBody before JSON parse
function express_raw_body(req, res, next) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    // Parse JSON manually so express.json() downstream doesn't blow up
    try {
      req.body = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  });
  req.on('error', next);
}

module.exports = router;
