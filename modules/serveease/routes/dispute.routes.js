const router = require('express').Router();
const ctrl = require('../controllers/dispute.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

router.use(authenticate);

// Customer raises a dispute
router.post('/', authorize('customer'), ctrl.createDispute);

// List disputes — customer sees their own; admin sees all
router.get('/', authorize('customer', 'admin'), ctrl.getDisputes);

// Single dispute — customer sees own; admin sees any
router.get('/:id', authorize('customer', 'admin'), ctrl.getDisputeById);

// Admin resolves a dispute
router.patch('/:id/resolve', authorize('admin'), ctrl.resolveDispute);

module.exports = router;
