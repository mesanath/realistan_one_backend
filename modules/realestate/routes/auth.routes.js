'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../../../src/middleware/realestate-auth.middleware');

// OTP login/verify moved to the single shared login system — see
// POST /api/v1/auth/send-otp and /api/v1/auth/verify-otp (src/auth/unifiedAuth.controller.js).
router.get('/getprofile', authenticate, ctrl.getProfile);
router.post('/updateuserdetails', authenticate, ctrl.updateUserDetails);
router.post('/deleteaccount', authenticate, ctrl.deleteAccount);
router.post('/loginbysocial', ctrl.loginBySocial);
router.post('/loginbytruecaller', ctrl.loginByTruecaller);
router.post('/logout', ctrl.logout);

module.exports = router;
