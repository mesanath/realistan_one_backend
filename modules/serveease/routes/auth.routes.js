const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../../../src/middleware/serveease-auth.middleware');
const { updateProfileRules } = require('../validators/validators');

// OTP login/verify/refresh moved to the single shared login system — see
// POST /api/v1/auth/send-otp, /verify-otp and /refresh (src/auth/unifiedAuth.controller.js).
router.get('/me', authenticate, ctrl.getMe);
router.get('/loyalty', authenticate, ctrl.getLoyalty);
router.patch('/profile', authenticate, updateProfileRules, ctrl.updateProfile);
router.delete('/account', authenticate, ctrl.deleteAccount);
router.post('/favorites/:serviceId', authenticate, ctrl.toggleFavorite);
router.post('/addresses', authenticate, ctrl.addAddress);
router.delete('/addresses/:addressId', authenticate, ctrl.removeAddress);
router.patch('/addresses/:addressId/default', authenticate, ctrl.setDefaultAddress);

module.exports = router;
