const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { bookingCreateLimit, otpVerifyLimit } = require('../../../src/middleware/rateLimit.middleware');
const { createBookingRules, verifyOtpBookingRules, cancelBookingRules } = require('../validators/validators');

// Multer: memory storage, images only, max 5 MB per file
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  },
});

router.use(authenticate);

router.post('/', authorize('customer', 'admin'), bookingCreateLimit, createBookingRules, ctrl.createBooking);
router.get('/', authorize('customer', 'admin'), ctrl.getMyBookings);
router.get('/:id', ctrl.getBooking);
router.patch('/:id/cancel', cancelBookingRules, ctrl.cancelBooking);

// Agent change request — customer triggers
router.post('/:id/request-agent-change', authorize('customer'), ctrl.requestAgentChange);

// Agent journey status updates
router.patch('/:id/en-route', authorize('agent'), ctrl.markEnRoute);
router.patch('/:id/arrived', authorize('agent'), ctrl.markArrived);

// OTP flow — agent triggers
router.post('/:id/send-start-otp', authorize('agent'), ctrl.sendStartOtp);
router.post('/:id/verify-start', authorize('agent'), otpVerifyLimit, verifyOtpBookingRules, ctrl.verifyStartOtp);
router.post('/:id/send-end-otp', authorize('agent'), ctrl.sendEndOtp);
router.post('/:id/verify-end', authorize('agent'), otpVerifyLimit, verifyOtpBookingRules, ctrl.verifyEndOtp);

// Photo proof — agent uploads before/after photos (EN5)
router.post('/:id/photos', authorize('agent'), photoUpload.array('photos', 3), ctrl.uploadJobPhoto);

module.exports = router;
