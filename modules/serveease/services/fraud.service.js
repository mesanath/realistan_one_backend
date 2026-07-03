const redis = require('../config/redis');
const FraudUser = require('../models/FraudUser');
const Setting = require('../models/Setting');
const logger = require('../utils/logger');

// ─── System defaults ─────────────────────────────────────────────────────────
// Seeded into MongoDB on first cache-load if they don't exist.
// $setOnInsert ensures admin-edited values are never overwritten.

const SYSTEM_DEFAULTS = [
  { key: 'OTP_LIMIT',                 value: 5,    dataType: 'number',  description: 'Max OTP requests per phone per window',       isSystem: true },
  { key: 'OTP_WINDOW_MINUTES',        value: 5,    dataType: 'number',  description: 'Rate-limit window length in minutes',          isSystem: true },
  { key: 'IP_LIMIT',                  value: 50,   dataType: 'number',  description: 'Max unique phones per IP per window',          isSystem: true },
  { key: 'OTP_BLOCK_DURATION_MINUTES',value: 60,   dataType: 'number',  description: 'Block duration after flagging (minutes)',      isSystem: true },
  { key: 'FRAUD_AUTO_BLOCK',          value: true, dataType: 'boolean', description: 'Auto-block phone number on threshold breach',  isSystem: true },
];

// ─── Settings Cache ───────────────────────────────────────────────────────────
// Avoid hitting MongoDB on every OTP request — cache for 60 seconds.

let _settingsCache = null;
let _settingsCacheAt = 0;
const SETTINGS_CACHE_TTL_MS = 60_000;

async function _loadSettings() {
  if (_settingsCache && Date.now() - _settingsCacheAt < SETTINGS_CACHE_TTL_MS) {
    return _settingsCache;
  }

  // Seed any missing system keys (idempotent — $setOnInsert never overwrites existing values)
  await Promise.all(
    SYSTEM_DEFAULTS.map((d) =>
      Setting.updateOne({ key: d.key }, { $setOnInsert: d }, { upsert: true }),
    ),
  );

  // Load all settings into a flat { KEY: value } map
  const docs = await Setting.find({});
  const flat = {};
  for (const d of docs) flat[d.key] = d.value;

  _settingsCache = flat;
  _settingsCacheAt = Date.now();
  return flat;
}

/** Call after any settings write so the next OTP request reads fresh values. */
function invalidateSettingsCache() {
  _settingsCache = null;
}

// ─── Block check ─────────────────────────────────────────────────────────────

/**
 * Returns { blocked: false } or { blocked: true, reason, blockedUntil }
 */
async function checkIfBlocked(phone) {
  const record = await FraudUser.findOne({ phone }).select('isBlocked blockedUntil flagReason');
  if (!record || !record.isBlocked) return { blocked: false };

  if (record.blockedUntil && new Date() > record.blockedUntil) {
    // Block window expired — lift it
    await FraudUser.findOneAndUpdate({ phone }, { $set: { isBlocked: false, blockedUntil: null } });
    return { blocked: false };
  }

  return { blocked: true, reason: record.flagReason, blockedUntil: record.blockedUntil };
}

// ─── Core check-and-record ────────────────────────────────────────────────────

/**
 * Increment the per-phone window counter and per-IP unique-phone set in Redis.
 * If either threshold is breached, write a FraudUser record and return { allowed: false }.
 *
 * @param {string} phone  Normalised E.164 phone (+91XXXXXXXXXX)
 * @param {string} ip     Request IP (req.ip or x-forwarded-for)
 * @returns {{ allowed: boolean, reason?: string, message?: string }}
 */
async function checkAndRecord(phone, ip) {
  const settings = await _loadSettings();
  const { OTP_LIMIT, IP_LIMIT, OTP_WINDOW_MINUTES, OTP_BLOCK_DURATION_MINUTES, FRAUD_AUTO_BLOCK } = settings;
  const windowSeconds = OTP_WINDOW_MINUTES * 60;

  // ── 1. Per-phone window rate limit ──────────────────────────────────────────
  const rateKey = `otp_rate:${phone}`;
  const count = await redis.incr(rateKey);
  if (count === 1) {
    // First request in this window — set TTL so Redis auto-resets after the window
    await redis.expire(rateKey, windowSeconds);
  }

  if (count > OTP_LIMIT) {
    logger.warn(`[Fraud] OTP limit exceeded phone=${phone} count=${count} limit=${OTP_LIMIT}`);
    _upsertFraudRecord(phone, ip, count, 'otp_limit_exceeded', FRAUD_AUTO_BLOCK, OTP_BLOCK_DURATION_MINUTES).catch((e) =>
      logger.error(`[Fraud] upsert failed: ${e.message}`),
    );
    return {
      allowed: false,
      reason: 'otp_limit_exceeded',
      message: `Too many OTP requests. Please wait ${OTP_WINDOW_MINUTES} minute(s) and try again.`,
    };
  }

  // ── 2. Per-IP unique phone count ────────────────────────────────────────────
  const ipKey = `otp_ip_phones:${ip}`;
  await redis.sadd(ipKey, phone);
  await redis.expire(ipKey, windowSeconds);
  const uniquePhones = await redis.scard(ipKey);

  if (uniquePhones > IP_LIMIT) {
    logger.warn(`[Fraud] IP limit exceeded ip=${ip} uniquePhones=${uniquePhones} limit=${IP_LIMIT}`);
    _upsertFraudRecord(phone, ip, count, 'ip_limit_exceeded', FRAUD_AUTO_BLOCK, OTP_BLOCK_DURATION_MINUTES).catch((e) =>
      logger.error(`[Fraud] upsert failed: ${e.message}`),
    );
    return {
      allowed: false,
      reason: 'ip_limit_exceeded',
      message: 'Request blocked due to suspicious activity from your network.',
    };
  }

  // ── 3. Record request analytics (fire-and-forget) ───────────────────────────
  _recordRequest(phone, ip, count).catch((e) =>
    logger.error(`[Fraud] record failed: ${e.message}`),
  );

  return { allowed: true };
}

// ─── Internal DB helpers ──────────────────────────────────────────────────────

async function _recordRequest(phone, ip, windowCount) {
  const now = new Date();
  const historyEntry = { requestedAt: now, ip, windowCount };

  // Attempt to increment an existing IP entry
  const updated = await FraudUser.findOneAndUpdate(
    { phone, 'ipAddresses.ip': ip },
    {
      $setOnInsert: { firstRequestAt: now },
      $set: { lastRequestAt: now, 'ipAddresses.$.lastSeenAt': now },
      $inc: { otpRequestCount: 1, 'ipAddresses.$.requestCount': 1 },
      $push: { requestHistory: { $each: [historyEntry], $slice: -100 } },
    },
    { upsert: false },
  );

  if (!updated) {
    // Phone not in DB yet, or IP is new for this phone — upsert with new IP entry
    await FraudUser.findOneAndUpdate(
      { phone },
      {
        $setOnInsert: { firstRequestAt: now, phone },
        $set: { lastRequestAt: now },
        $inc: { otpRequestCount: 1 },
        $push: {
          requestHistory: { $each: [historyEntry], $slice: -100 },
          ipAddresses: { ip, firstSeenAt: now, lastSeenAt: now, requestCount: 1 },
        },
      },
      { upsert: true },
    );
  }
}

async function _upsertFraudRecord(phone, ip, windowCount, reason, autoBlock, blockMinutes) {
  const now = new Date();
  const historyEntry = { requestedAt: now, ip, windowCount };
  const blockedUntil = autoBlock ? new Date(now.getTime() + blockMinutes * 60_000) : null;

  await FraudUser.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: { firstRequestAt: now, phone },
      $set: {
        isFlagged: true,
        flagReason: reason,
        flaggedAt: now,
        lastRequestAt: now,
        isBlocked: !!autoBlock,
        blockedUntil,
      },
      $inc: { otpRequestCount: 1 },
      $push: { requestHistory: { $each: [historyEntry], $slice: -100 } },
    },
    { upsert: true },
  );
}

module.exports = { checkAndRecord, checkIfBlocked, invalidateSettingsCache };
