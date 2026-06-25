'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../../../src/middleware/realestate-auth.middleware');
const { otpRateLimit, otpVerifyLimit } = require('../../../src/middleware/rateLimit.middleware');

router.post('/loginbymobile', otpRateLimit, ctrl.sendOtp);
router.post('/loginbymobile/verify', otpVerifyLimit, ctrl.verifyOtp);
router.get('/getprofile', authenticate, ctrl.getProfile);
router.post('/updateuserdetails', authenticate, ctrl.updateUserDetails);
router.post('/loginbysocial', ctrl.loginBySocial);
router.post('/loginbytruecaller', ctrl.loginByTruecaller);
router.post('/logout', ctrl.logout);

module.exports = router;
