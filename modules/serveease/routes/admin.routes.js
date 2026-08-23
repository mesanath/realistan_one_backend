const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const subscriptionCtrl = require('../controllers/subscription.controller');
const fraudCtrl = require('../controllers/admin.fraud.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { adminMutationLimit } = require('../../../src/middleware/rateLimit.middleware');
const { createAgentRules, updateAgentRules, setAgentCredentialsRules, reviewSkillRequestRules } = require('../validators/validators');

router.use(authenticate);

// Three ServeEase admin role tiers (see constants/adminRoles.js). ServeEase has
// no admin-console-user-creation concept of its own — that carve-out only
// applies on the realistan-admin side — so 'admin' and 'operations' get
// identical ServeEase access here. 'customer_services_management' is scoped
// down to exactly the "reply / update status" surface: viewing bookings/
// customers/agents for context, and updating a booking's status. Everything
// else (agent management, coupons, zones, payments, settings, analytics,
// fraud, agent-change-requests) requires 'admin' or 'operations'.
const FULL = authorize('admin', 'operations');
const CS_OK = authorize('admin', 'operations', 'customer_services_management');

// Dashboard
router.get('/dashboard', CS_OK, ctrl.getDashboard);

// Bookings
router.get('/bookings/heatmap', FULL, ctrl.getBookingHeatmap);
router.get('/bookings', CS_OK, ctrl.getAllBookings);
router.patch('/bookings/:id', CS_OK, ctrl.updateBooking);
router.patch('/bookings/:id/assign-agent', FULL, adminMutationLimit, ctrl.assignAgentToBooking);

// Agent Change Requests
router.get('/agent-change-requests', FULL, ctrl.getAgentChangeRequests);
router.patch('/agent-change-requests/:id', FULL, adminMutationLimit, ctrl.reviewAgentChangeRequest);

// Customers
router.get('/customers', CS_OK, ctrl.getCustomers);
router.get('/customers/:id', CS_OK, ctrl.getCustomerById);
router.patch('/customers/:id/toggle-active', FULL, ctrl.toggleCustomerActive);

// Agents — list/detail are CS_OK (context: who's assigned to a booking), all
// agent management actions require FULL.
router.get('/agents/locations', FULL, ctrl.getAgentLocations);
router.get('/agents', CS_OK, ctrl.getAgents);
router.get('/agents/:id', CS_OK, ctrl.getAgentById);
router.post('/agents', FULL, adminMutationLimit, createAgentRules, ctrl.createAgent);
router.patch('/agents/:id', FULL, adminMutationLimit, updateAgentRules, ctrl.updateAgent);
router.patch('/agents/:id/approve', FULL, adminMutationLimit, ctrl.approveAgent);
router.patch('/agents/:id/toggle-active', FULL, adminMutationLimit, ctrl.toggleAgentActive);
router.patch('/agents/:id/background-verify', FULL, adminMutationLimit, ctrl.toggleBackgroundVerify);
router.patch('/agents/:id/credentials', FULL, adminMutationLimit, setAgentCredentialsRules, ctrl.setAgentCredentials);

// Agent Skill Requests
router.get('/skill-requests', FULL, ctrl.getSkillRequests);
router.patch('/skill-requests/:id', FULL, adminMutationLimit, reviewSkillRequestRules, ctrl.reviewSkillRequest);

// Analytics & Audit
router.get('/audit', FULL, ctrl.getAuditLogs);
router.get('/analytics/revenue', FULL, ctrl.getRevenueAnalytics);
router.get('/analytics/bookings', FULL, ctrl.getBookingStats);

// Promotions (Coupons)
router.get('/coupons', FULL, ctrl.getAdminCoupons);
router.post('/coupons', FULL, adminMutationLimit, ctrl.createAdminCoupon);
router.patch('/coupons/:id', FULL, adminMutationLimit, ctrl.updateAdminCoupon);
router.patch('/coupons/:id/toggle', FULL, adminMutationLimit, ctrl.toggleAdminCoupon);

// Zones
router.get('/zones', FULL, ctrl.getAdminZones);
router.post('/zones', FULL, adminMutationLimit, ctrl.createAdminZone);
router.patch('/zones/:id', FULL, adminMutationLimit, ctrl.updateAdminZone);
router.patch('/zones/:id/toggle', FULL, adminMutationLimit, ctrl.toggleAdminZone);

// Payments
router.get('/payments', FULL, ctrl.getAdminPayments);

// Subscriptions
router.get('/subscriptions', FULL, subscriptionCtrl.getAdminSubscriptions);

// Fraud management
router.get('/fraud-users', FULL, fraudCtrl.getFraudUsers);
router.get('/fraud-users/:phone', FULL, fraudCtrl.getFraudUserByPhone);
router.patch('/fraud-users/:phone/unblock', FULL, adminMutationLimit, fraudCtrl.unblockFraudUser);
router.patch('/fraud-users/:phone/flag', FULL, adminMutationLimit, fraudCtrl.flagFraudUser);

// App settings — full CRUD + bulk save for dashboard
router.get('/settings', FULL, fraudCtrl.getSettings);
router.post('/settings/bulk', FULL, adminMutationLimit, fraudCtrl.bulkUpdateSettings);  // must be before /:key
router.post('/settings', FULL, adminMutationLimit, fraudCtrl.createSetting);
router.patch('/settings/:key', FULL, adminMutationLimit, fraudCtrl.updateSetting);
router.delete('/settings/:key', FULL, adminMutationLimit, fraudCtrl.deleteSetting);

module.exports = router;
