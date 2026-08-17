'use strict';
/**
 * Single OTP engine for the whole backend's login flow — used by every product
 * (realestate + serveease) via src/auth/unifiedAuth.controller.js. Replaces the two
 * separate OTP implementations that used to live in each module's own auth controller.
 */
const { randomInt } = require('node:crypto');
const redis = require('../../modules/serveease/config/redis');
const { sendOtp: dispatchOtpSms } = require('../../modules/serveease/utils/otp');

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '600', 10);
const HARDCODED_OTP = '123456';

/**
 * Login form model is `countryCode` (e.g. "91") + `phone` (e.g. "9591972808"), matched
 * to a single E.164 string. Also accepts an already-combined `mobile`/`phone` string
 * (with or without a leading "+") for callers that haven't been updated to send the
 * two fields separately.
 * @returns {string} E.164 phone, e.g. "+919591972808"
 * @throws {Error} with `.status = 400` if the number doesn't look like a valid India mobile
 */
exports.normalizePhone = ({ countryCode, phone, mobile } = {}) => {
    const raw = phone || mobile || '';
    const digitsOnly = String(raw).replace(/[^\d]/g, '');
    const cc = String(countryCode || '91').replace(/[^\d]/g, '') || '91';

    let e164;
    if (String(raw).trim().startsWith('+')) {
        // Already fully-qualified — trust it as-is.
        e164 = '+' + digitsOnly;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith(cc)) {
        // Phone field already includes the country code digits.
        e164 = `+${digitsOnly}`;
    } else {
        e164 = `+${cc}${digitsOnly}`;
    }

    // India-specific sanity check (the only market this system serves today) — mobile
    // subscriber numbers start 6-9 and are exactly 10 digits after the +91.
    if (e164.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(e164)) {
        const err = new Error('Invalid mobile number');
        err.status = 400;
        throw err;
    }
    if (!e164.startsWith('+91') && digitsOnly.length < 6) {
        const err = new Error('Invalid mobile number');
        err.status = 400;
        throw err;
    }
    return e164;
};

/**
 * Development, staging, local (any NODE_ENV other than "production") always returns the
 * fixed `123456` OTP so login can be tested without a real SMS. Production generates a
 * cryptographically random 6-digit code.
 */
exports.generateLoginOtp = () => {
    if (process.env.NODE_ENV === 'production') {
        return String(randomInt(100000, 1000000));
    }
    return HARDCODED_OTP;
};

const otpKey = (phone) => `login_otp:${phone}`;

exports.storeOtp = async (phone, otp) => {
    await redis.set(otpKey(phone), otp, OTP_EXPIRY_SECONDS);
};

exports.consumeOtp = async (phone, submittedOtp) => {
    const stored = await redis.get(otpKey(phone));
    if (!stored || stored !== submittedOtp) return false;
    await redis.del(otpKey(phone));
    return true;
};

/** Sends the OTP by SMS (skipped automatically outside production — see modules/serveease/utils/otp.js). */
exports.dispatchOtpSms = dispatchOtpSms;
