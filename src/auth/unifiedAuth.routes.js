'use strict';
const router = require('express').Router();
const ctrl = require('./unifiedAuth.controller');
const { otpRateLimit, otpVerifyLimit } = require('../middleware/rateLimit.middleware');

// POST /api/v1/auth/send-otp
// body: { phone|mobile, type: "realestate"|"serveease" }
router.post('/send-otp', otpRateLimit, ctrl.sendOtp);

// POST /api/v1/auth/verify-otp
// body: { phone|mobile, otp, type: "realestate"|"serveease" }
router.post('/verify-otp', otpVerifyLimit, ctrl.verifyOtp);

// POST /api/v1/auth/loginbysocial  — realestate social login (Google/Apple/Facebook)
router.post('/loginbysocial', ctrl.loginBySocial);

// POST /api/v1/auth/loginbytruecaller  — realestate Truecaller login
router.post('/loginbytruecaller', ctrl.loginByTruecaller);

// POST /api/v1/auth/refresh  — serveease token refresh
router.post('/refresh', ctrl.refreshToken);

module.exports = router;
