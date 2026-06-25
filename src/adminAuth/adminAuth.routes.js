'use strict';
const router = require('express').Router();
const ctrl = require('./adminAuth.controller');

// POST /api/v1/admin-auth/send-otp
// body: { phone }  — sends OTP to registered super admin phone
router.post('/send-otp', ctrl.sendOtp);

// POST /api/v1/admin-auth/verify-otp
// body: { phone, otp }  — returns unified admin JWT for both panels
router.post('/verify-otp', ctrl.verifyOtp);

// POST /api/v1/admin-auth/login
// body: { email, password }  — email+password login (legacy + super admin)
router.post('/login', ctrl.login);

module.exports = router;
