const redis = require('../config/redis');
const { generateOtp, hashOtp } = require('../utils/generateOtp');
const { sendOtp: dispatchOtpSms, maskMobile } = require('../utils/otp');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600');
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
const DEV_MODE = process.env.OTP_DEV_MODE === 'true';

/**
 * Issue an OTP, store in Redis, send via SMS (or log in dev)
 * @param {string} phone  - customer phone
 * @param {string} bookingId
 * @param {'start'|'end'} phase
 * @returns {string} raw OTP (only returned in dev mode)
 */
const issueOtp = async (phone, bookingId, phase = 'start') => {
  const otp = generateOtp(6);
  const key = `otp:${bookingId}:${phase}`;

  // Store raw OTP in Redis with TTL
  await redis.set(key, otp, OTP_EXPIRY);

  const hashed = await hashOtp(otp);

  if (DEV_MODE) {
    logger.info(`[DEV OTP] Booking ${bookingId} | Phase ${phase} | OTP: ${otp}`);
  } else {
    const result = await dispatchOtpSms(phone, otp);
    if (result.ok) {
      logger.info(`Booking OTP delivered booking=${bookingId} phase=${phase} mobile=${maskMobile(phone)} provider=${result.provider}`);
    } else {
      logger.error(`Booking OTP delivery FAILED booking=${bookingId} phase=${phase} mobile=${maskMobile(phone)} errors=${JSON.stringify(result.errors)}`);
      await AuditLog.create({ type: 'otp_send_failed', bookingId, meta: { phase, errors: result.errors } });
    }
  }

  return { hashed, raw: DEV_MODE ? otp : null };
};

/**
 * Verify an OTP entered by agent
 */
const validateOtp = async (bookingId, phase, enteredOtp, userId) => {
  const key = `otp:${bookingId}:${phase}`;
  const attemptsKey = `otp_attempts:${bookingId}:${phase}`;

  // Check lockout
  const attempts = parseInt((await redis.get(attemptsKey)) || '0');
  if (attempts >= MAX_ATTEMPTS) {
    await AuditLog.create({ type: 'otp_locked', bookingId, userId, meta: { phase } });
    return { success: false, message: 'OTP locked due to too many failed attempts.' };
  }

  const storedOtp = await redis.get(key);
  if (!storedOtp) {
    await AuditLog.create({ type: 'otp_expired', bookingId, userId, meta: { phase } });
    return { success: false, message: 'OTP has expired. Request a new one.' };
  }

  if (storedOtp !== enteredOtp) {
    const newAttempts = await redis.incr(attemptsKey);
    await redis.set(attemptsKey, String(newAttempts), OTP_EXPIRY);
    await AuditLog.create({ type: 'otp_failed', bookingId, userId, meta: { phase, attempt: newAttempts } });
    return { success: false, message: `Incorrect OTP. ${MAX_ATTEMPTS - newAttempts} attempts remaining.` };
  }

  // Valid — clean up
  await redis.del(key);
  await redis.del(attemptsKey);
  await AuditLog.create({ type: 'otp_verified', bookingId, userId, meta: { phase } });
  return { success: true };
};

module.exports = { issueOtp, validateOtp };
