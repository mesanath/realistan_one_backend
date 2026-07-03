const router = require('express').Router();
const ctrl = require('../controllers/dispute.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

router.use(authenticate);

// Customer or agent raises a dispute
router.post('/', authorize('customer', 'agent'), ctrl.createDispute);

// List disputes — customer/agent see their own; admin sees all
router.get('/', authorize('customer', 'agent', 'admin'), ctrl.getDisputes);

// Single dispute — customer/agent see own; admin sees any
router.get('/:id', authorize('customer', 'agent', 'admin'), ctrl.getDisputeById);

// Admin sends a customer-visible reply (without resolving)
router.patch('/:id/reply', authorize('admin'), ctrl.replyToDispute);

// Admin resolves a dispute
router.patch('/:id/resolve', authorize('admin'), ctrl.resolveDispute);

module.exports = router;
