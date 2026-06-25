const router = require('express').Router();
const ctrl = require('../controllers/corporate.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

router.use(authenticate);

// Customer routes
router.post('/register', authorize('customer'), ctrl.registerCorporate);
router.post('/', authorize('customer'), ctrl.createCorporateBooking);
router.get('/', authorize('customer'), ctrl.getMyCorporateBookings);
router.get('/:id', authorize('customer', 'admin'), ctrl.getCorporateBookingById);

// Admin routes
router.get('/admin/all', authorize('admin'), ctrl.getAdminCorporateBookings);
router.get('/admin/pending-registrations', authorize('admin'), ctrl.getPendingCorporateRegistrations);
router.patch('/admin/approve/:userId', authorize('admin'), ctrl.approveCorporateAccount);
router.patch('/admin/:id/status', authorize('admin'), ctrl.updateCorporateBookingStatus);

module.exports = router;
