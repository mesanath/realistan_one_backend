const router = require('express').Router();
const ctrl = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/plans', ctrl.getPlans);

// ─── Customer (authenticated) ─────────────────────────────────────────────────
router.post('/', authenticate, authorize('customer'), ctrl.subscribe);
router.get('/mine', authenticate, authorize('customer'), ctrl.getMySubscription);
router.patch('/mine/cancel', authenticate, authorize('customer'), ctrl.cancelSubscription);

module.exports = router;
