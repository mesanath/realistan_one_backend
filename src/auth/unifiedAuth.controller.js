'use strict';
/**
 * The one login system for the whole backend — realestate and serveease share this
 * exact code path, the same `User` collection (src/models/User.js), and the same JWT
 * (src/utils/token.js). There is no more per-product OTP implementation: the module
 * routes that used to duplicate this (`/realestate/auth/loginbymobile`,
 * `/serveease/auth/send-otp`) have been removed — this is the only way to log in.
 *
 * Login model: `countryCode` (default "91") + `phone`, matched to one E.164 identity.
 * OTP: hardcoded "123456" outside production, a random 6-digit code in production
 * (see src/auth/otpEngine.js).
 */
const User = require('../models/User');
const Agent = require('../../modules/serveease/models/Agent');
const { checkAndRecord, checkIfBlocked } = require('../../modules/serveease/services/fraud.service');
const { normalizePhone, generateLoginOtp, storeOtp, consumeOtp, dispatchOtpSms } = require('./otpEngine');
const { signAuthTokens, verifyAuthToken } = require('../utils/token');

const requestIp = (req) => (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || 'unknown';

exports.sendOtp = async (req, res) => {
    try {
        const phone = normalizePhone(req.body);

        const blockCheck = await checkIfBlocked(phone);
        if (blockCheck.blocked) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Your number has been temporarily blocked.',
                blockedUntil: blockCheck.blockedUntil,
            });
        }

        const fraudCheck = await checkAndRecord(phone, requestIp(req));
        if (!fraudCheck.allowed) {
            return res.status(429).json({ success: false, message: fraudCheck.message });
        }

        const otp = generateLoginOtp();
        await storeOtp(phone, otp);

        const smsResult = await dispatchOtpSms(phone, otp);
        if (!smsResult.ok && !smsResult.skipped) {
            return res.status(502).json({ success: false, message: 'Failed to send OTP. Please try again.' });
        }

        return res.json({
            success: true,
            message: 'OTP sent successfully!',
            mobile: phone,
            ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
        });
    } catch (error) {
        const status = error.status || 400;
        return res.status(status).json({ success: false, message: error.message || String(error) });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { otp, role = 'customer', name } = req.body;
        const phone = normalizePhone(req.body);
        if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

        const ok = await consumeOtp(phone, otp);
        if (!ok) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

        let account, isNew = false;
        if (role === 'agent') {
            account = await Agent.findOne({ phone });
            if (!account) {
                account = await Agent.create({ phone, name: name || 'Agent', city: 'Bangalore', gender: 'male' });
                isNew = true;
            }
        } else if (role === 'admin') {
            account = await User.findOne({ phone, isAdmin: true });
            if (!account) return res.status(403).json({ success: false, message: 'Admin access denied for this number' });
        } else {
            account = await User.findOne({ phone });
            if (account?.isDeleted) {
                return res.status(403).json({ success: false, message: 'This account has been deleted. Please contact support if this was a mistake.' });
            }
            if (!account) {
                account = await User.create({ phone, name: name || 'User', loginType: 'mobile' });
                isNew = true;
            }
        }

        const tokens = signAuthTokens({ id: account._id.toString(), phone, role, screenName: account.screenName || account.name });

        const userPayload = {
            _id: account._id,
            id: account._id,
            name: account.name,
            screenName: account.screenName || account.name,
            phone,
            mobile: phone,
            email: account.email,
            role,
        };

        return res.json({
            success: true,
            message: 'Login successful!',
            isNew,
            signup: isNew,
            tokens,
            token: tokens.access, // legacy flat field — some older clients still read this directly
            mobile: phone,
            screenName: userPayload.screenName,
            user: userPayload,
        });
    } catch (error) {
        const status = error.status || 400;
        return res.status(status).json({ success: false, message: error.message || String(error) });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
        const decoded = verifyAuthToken(refreshToken);
        const tokens = signAuthTokens({ id: decoded.id || decoded._id, phone: decoded.phone, role: decoded.role, screenName: decoded.screenName });
        return res.json({ success: true, tokens, token: tokens.access });
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
};

// Social login — Google/Apple/Facebook. Realestate-specific alt sign-in, unaffected by
// the OTP unification; delegates to the shared User model.
exports.loginBySocial = (req, res) => require('../../modules/realestate/controllers/auth.controller').loginBySocial(req, res);

// Truecaller login — realestate-specific alt sign-in, same shared User model.
exports.loginByTruecaller = (req, res) => require('../../modules/realestate/controllers/auth.controller').loginByTruecaller(req, res);
