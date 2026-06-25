'use strict';

const realestateAuthCtrl = require('../../modules/realestate/controllers/auth.controller');
const serveeaseAuthCtrl = require('../../modules/serveease/controllers/auth.controller');

/**
 * Unified auth — routes to the correct module based on `type`.
 *
 * type: "realestate" → mobile OTP + social login (native MongoDB, Kaleyra SMS)
 * type: "serveease"  → phone OTP for customers/agents (Mongoose, Redis, SMS providers)
 *
 * Body: { mobile, countryCode?, type: "realestate"|"serveease", ...rest }
 * `mobile` is the canonical field; `phone` is accepted as an alias.
 * `countryCode` (e.g. "+91") is optional — prepended to mobile when mobile lacks a + prefix.
 */

const VALID_TYPES = ['realestate', 'serveease'];

const getType = (req) => req.body.type || req.query.type;

const normalizeMobile = (req) => {
    const raw = req.body.mobile || req.body.phone || '';
    const countryCode = (req.body.countryCode || '').trim().replace(/^\+/, '');
    if (!raw) return '';
    // Already E.164 — leave as-is
    if (raw.startsWith('+')) return raw;
    // Prepend country code when provided
    if (countryCode) return `+${countryCode}${raw}`;
    return raw;
};

exports.sendOtp = (req, res) => {
    const type = getType(req);

    if (!type || !VALID_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'type required: "realestate" or "serveease"' });
    }

    const mobile = normalizeMobile(req);
    if (!mobile) {
        return res.status(400).json({ success: false, message: 'mobile number is required' });
    }

    // Stamp canonical fields so each module reads what it expects
    req.body.mobile = mobile;   // realestate reads this
    req.body.phone = mobile;    // serveease reads this
    req.body.appType = type;    // both modules persist this

    if (type === 'realestate') return realestateAuthCtrl.sendOtp(req, res);
    return serveeaseAuthCtrl.sendOtp(req, res);
};

exports.verifyOtp = (req, res) => {
    const type = getType(req);

    if (!type || !VALID_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'type required: "realestate" or "serveease"' });
    }

    const mobile = normalizeMobile(req);
    if (!mobile) {
        return res.status(400).json({ success: false, message: 'mobile number is required' });
    }

    req.body.mobile = mobile;
    req.body.phone = mobile;
    req.body.appType = type;

    if (type === 'realestate') return realestateAuthCtrl.verifyOtp(req, res);
    return serveeaseAuthCtrl.verifyOtp(req, res);
};

// Social login — realestate only
exports.loginBySocial = (req, res) => realestateAuthCtrl.loginBySocial(req, res);

// Truecaller login — realestate only
exports.loginByTruecaller = (req, res) => realestateAuthCtrl.loginByTruecaller(req, res);

// Refresh token — serveease only
exports.refreshToken = (req, res) => serveeaseAuthCtrl.refreshToken(req, res);
