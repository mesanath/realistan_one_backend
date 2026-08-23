const router = require('express').Router();
const ctrl = require('../controllers/dispute.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

router.use(authenticate);

// Admin-side roles allowed to view/act on disputes — every admin tier gets at
// least this (see constants/adminRoles.js): dispute reply/resolve is exactly
// the "reply permission" customer_services_management is meant to have.
const ANY_ADMIN = ['admin', 'operations', 'customer_services_management'];

// Customer or agent raises a dispute
router.post('/', authorize('customer', 'agent'), ctrl.createDispute);

// List disputes — customer/agent see their own; any admin tier sees all
router.get('/', authorize('customer', 'agent', ...ANY_ADMIN), ctrl.getDisputes);

// Single dispute — customer/agent see own; any admin tier sees any
router.get('/:id', authorize('customer', 'agent', ...ANY_ADMIN), ctrl.getDisputeById);

// Sends a customer-visible reply (without resolving) — any admin tier
router.patch('/:id/reply', authorize(...ANY_ADMIN), ctrl.replyToDispute);

// Resolves a dispute — any admin tier
router.patch('/:id/resolve', authorize(...ANY_ADMIN), ctrl.resolveDispute);

module.exports = router;
