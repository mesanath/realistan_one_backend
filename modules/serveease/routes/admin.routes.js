const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const subscriptionCtrl = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { adminMutationLimit } = require('../../../src/middleware/rateLimit.middleware');
const { createServiceRules, updateServiceRules, createAgentRules, updateAgentRules } = require('../validators/validators');

router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Bookings
router.get('/bookings/heatmap', ctrl.getBookingHeatmap);
router.get('/bookings', ctrl.getAllBookings);
router.patch('/bookings/:id', ctrl.updateBooking);
router.patch('/bookings/:id/assign-agent', adminMutationLimit, ctrl.assignAgentToBooking);

// Agent Change Requests
router.get('/agent-change-requests', ctrl.getAgentChangeRequests);
router.patch('/agent-change-requests/:id', adminMutationLimit, ctrl.reviewAgentChangeRequest);

// Customers
router.get('/customers', ctrl.getCustomers);
router.get('/customers/:id', ctrl.getCustomerById);
router.patch('/customers/:id/toggle-active', ctrl.toggleCustomerActive);

// Agents
router.get('/agents/locations', ctrl.getAgentLocations);
router.get('/agents', ctrl.getAgents);
router.get('/agents/:id', ctrl.getAgentById);
router.post('/agents', adminMutationLimit, createAgentRules, ctrl.createAgent);
router.patch('/agents/:id', adminMutationLimit, updateAgentRules, ctrl.updateAgent);
router.patch('/agents/:id/approve', adminMutationLimit, ctrl.approveAgent);
router.patch('/agents/:id/toggle-active', adminMutationLimit, ctrl.toggleAgentActive);
router.patch('/agents/:id/background-verify', adminMutationLimit, ctrl.toggleBackgroundVerify);

// Analytics & Audit
router.get('/audit', ctrl.getAuditLogs);
router.get('/analytics/revenue', ctrl.getRevenueAnalytics);
router.get('/analytics/bookings', ctrl.getBookingStats);

// Promotions (Coupons)
router.get('/coupons', ctrl.getAdminCoupons);
router.post('/coupons', adminMutationLimit, ctrl.createAdminCoupon);
router.patch('/coupons/:id', adminMutationLimit, ctrl.updateAdminCoupon);
router.patch('/coupons/:id/toggle', adminMutationLimit, ctrl.toggleAdminCoupon);

// Zones
router.get('/zones', ctrl.getAdminZones);
router.post('/zones', adminMutationLimit, ctrl.createAdminZone);
router.patch('/zones/:id', adminMutationLimit, ctrl.updateAdminZone);
router.patch('/zones/:id/toggle', adminMutationLimit, ctrl.toggleAdminZone);

// Payments
router.get('/payments', ctrl.getAdminPayments);

// Subscriptions
router.get('/subscriptions', subscriptionCtrl.getAdminSubscriptions);

module.exports = router;
