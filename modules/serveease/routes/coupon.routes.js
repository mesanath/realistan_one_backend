const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

// Public — list active coupons for the checkout page
router.get('/', ctrl.getActiveCoupons);

// Public — list currently live flash deals
router.get('/flash', ctrl.getFlashDeals);

// Customer only — validate a coupon code + compute discount
router.post('/validate', authenticate, authorize('customer', 'admin'), ctrl.validateCoupon);

module.exports = router;
