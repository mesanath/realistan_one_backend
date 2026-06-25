const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../../../src/middleware/serveease-auth.middleware');
const { otpRateLimit } = require('../../../src/middleware/rateLimit.middleware');
const { sendOtpRules, verifyOtpRules, updateProfileRules } = require('../validators/validators');

router.post('/send-otp', otpRateLimit, sendOtpRules, ctrl.sendOtp);
router.post('/verify-otp', verifyOtpRules, ctrl.verifyOtp);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.get('/loyalty', authenticate, ctrl.getLoyalty);
router.patch('/profile', authenticate, updateProfileRules, ctrl.updateProfile);
router.post('/favorites/:serviceId', authenticate, ctrl.toggleFavorite);
router.post('/addresses', authenticate, ctrl.addAddress);
router.delete('/addresses/:addressId', authenticate, ctrl.removeAddress);
router.patch('/addresses/:addressId/default', authenticate, ctrl.setDefaultAddress);

module.exports = router;
