const { randomInt, randomUUID } = require('node:crypto');
const logger = require('./logger');

const DEV_LIKE_ENVS = new Set(['development', 'staging', 'test']);

/**
 * Generates a numeric OTP string.
 * Returns the fixed value `123456` in `development`, `staging`, and `test` to simplify local and QA testing.
 * In `production`, uses `node:crypto randomInt` for a cryptographically secure result.
 */
function generateOtp(length = 6) {
  if (DEV_LIKE_ENVS.has(process.env.NODE_ENV)) {
    return '123456'.slice(0, length).padEnd(length, '0');
  }
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return randomInt(min, max).toString();
}

/**
 * Generates a 25-character alphanumeric ID by stripping dashes from a UUID.
 * Suitable for use as short correlation IDs or reference codes.
 */
function generateShortId() {
  return randomUUID().replace(/-/g, '').slice(0, 25);
}

/**
 * Converts a human-readable expiry string to milliseconds.
 * Supported units: `s` (seconds), `m` (minutes), `h` (hours), `d` (days).
 * @example parseExpiryToMs('15m') // 900000
 * @throws {Error} if the format is unrecognised.
 */
function parseExpiryToMs(expiry) {
  const match = String(expiry).match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown expiry unit: ${unit}`);
  }
}

/**
 * Validates and normalises an Indian mobile number to E.164 format (+91XXXXXXXXXX).
 * Accepts: "9876543210", "+91 98765 43210", "919876543210", "0091-9876543210".
 * Rejects numbers whose subscriber digit does not start with 6-9 (India mobile rule).
 * @returns {{ normalized: string }}
 * @throws {Error} with status 400 metadata if invalid.
 */
function parseMobile(input) {
  if (typeof input !== 'string') {
    const err = new Error('Invalid mobile format');
    err.status = 400;
    err.code = 'INVALID_MOBILE';
    throw err;
  }
  const digits = input.replace(/[^\d]/g, '');
  let local;
  if (digits.length === 10) local = digits;
  else if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 14 && digits.startsWith('0091')) local = digits.slice(4);
  else {
    const err = new Error('Invalid mobile format');
    err.status = 400;
    err.code = 'INVALID_MOBILE';
    throw err;
  }
  if (!/^[6-9]\d{9}$/.test(local)) {
    const err = new Error('Invalid mobile format');
    err.status = 400;
    err.code = 'INVALID_MOBILE';
    throw err;
  }
  return { normalized: `+91${local}` };
}

/**
 * Returns last 4 digits prefixed with **** for safe log output. Never log the full mobile.
 */
function maskMobile(mobile) {
  const s = String(mobile || '');
  return `****${s.slice(-4)}`;
}

/**
 * Substitutes the OTP and signature into a DLT-approved template.
 * Collapses whitespace.
 */
function buildSmsBody(template, signature, otp) {
  return String(template)
    .replace('{#numeric#}', otp)
    .replace('{#alphanumeric#}', signature)
    .replace(/\s+/g, ' ')
    .trim();
}

const KALEYRA_DEFAULT_SIGNATURE = process.env.KALEYRA_SIGNATURE || '3d0aH5sFDny';

/**
 * Sends OTP via Kaleyra REST API. POST JSON to cloud-api.in.kaleyra.io.
 * @param {string} mobile - E.164 number
 * @param {string} otp
 * @param {{ fetchImpl?: typeof fetch }} [deps] - injected for tests
 */
async function sendSmsKaleyra(mobile, otp, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const { KALEYRA_SENDER_URL, KALEYRA_KEY, KALEYRA_SENDER_ID, KALEYRA_TEMPLATE } = process.env;
  if (!KALEYRA_SENDER_URL || !KALEYRA_KEY || !KALEYRA_SENDER_ID || !KALEYRA_TEMPLATE) {
    logger.warn(`Kaleyra not configured (mobile=${maskMobile(mobile)})`);
    throw new Error('Kaleyra provider is not configured');
  }

  const smsBody = buildSmsBody(KALEYRA_TEMPLATE, KALEYRA_DEFAULT_SIGNATURE, otp);
  logger.info(`Kaleyra send → ${maskMobile(mobile)} body="${smsBody}"`);

  const response = await fetchImpl(KALEYRA_SENDER_URL, {
    method: 'POST',
    headers: {
      'api-key': KALEYRA_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: mobile,
      sender: KALEYRA_SENDER_ID,
      body: smsBody,
      type: 'OTP',
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    logger.error(`Kaleyra failed (${response.status}) for ${maskMobile(mobile)} body=${responseBody}`);
    throw new Error(`Kaleyra SMS failed with status ${response.status}`);
  }
  logger.info(`Kaleyra OK ${response.status} for ${maskMobile(mobile)}`);
}

/**
 * Sends OTP via SMSStriker. GET with query params; expects 10-digit local number (strips +91).
 * @param {string} mobile - E.164 number
 * @param {string} otp
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
async function sendSmsSmsStriker(mobile, otp, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const {
    SMSSTRIKER_URL,
    SMSSTRIKER_USERNAME,
    SMSSTRIKER_PASSWORD,
    SMSSTRIKER_SENDER_ID,
    SMSSTRIKER_TEMPLATE,
    SMSSTRIKER_TEMPLATE_ID,
  } = process.env;
  if (!SMSSTRIKER_URL || !SMSSTRIKER_USERNAME || !SMSSTRIKER_PASSWORD || !SMSSTRIKER_SENDER_ID || !SMSSTRIKER_TEMPLATE || !SMSSTRIKER_TEMPLATE_ID) {
    logger.warn(`SMSStriker not configured (mobile=${maskMobile(mobile)})`);
    throw new Error('SMSStriker provider is not configured');
  }
  const localNumber = mobile.startsWith('+91') ? mobile.slice(3) : mobile.replace(/^\+/, '');
  const params = new URLSearchParams({
    username: SMSSTRIKER_USERNAME,
    password: SMSSTRIKER_PASSWORD,
    from: SMSSTRIKER_SENDER_ID,
    to: localNumber,
    msg: buildSmsBody(SMSSTRIKER_TEMPLATE, KALEYRA_DEFAULT_SIGNATURE, otp),
    type: '1',
    template_id: SMSSTRIKER_TEMPLATE_ID,
  });
  const url = `${SMSSTRIKER_URL}?${params.toString()}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    logger.error(`SMSStriker failed (${response.status}) for ${maskMobile(mobile)}`);
    throw new Error(`SMSStriker SMS failed with status ${response.status}`);
  }
  logger.info(`SMSStriker OK for ${maskMobile(mobile)}`);
}

const SMS_PROVIDERS = {
  kaleyra: sendSmsKaleyra,
  smsstriker: sendSmsSmsStriker,
};

const TWILIO_ERRORS = {
  notConfigured: 'Twilio WhatsApp provider is not configured',
  deliveryFailed: (status) => `Twilio WhatsApp OTP delivery failed with status ${status}`,
};

/**
 * Sends OTP via Twilio WhatsApp using a pre-approved ContentSid template.
 * Variable {1} in the template is replaced with the OTP.
 * @param {string} mobile - E.164 number
 * @param {string} otp
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
async function sendWhatsAppTwilio(mobile, otp, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const {
    TWILIO_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_SENDER_NUMBER,
    TWILIO_CONTENT_SID,
  } = process.env;

  if (!TWILIO_URL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_SENDER_NUMBER || !TWILIO_CONTENT_SID) {
    logger.warn({ provider: 'twilio', mobile: maskMobile(mobile) }, TWILIO_ERRORS.notConfigured);
    throw new Error(TWILIO_ERRORS.notConfigured);
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({
    To: `whatsapp:${mobile}`,
    From: `whatsapp:${TWILIO_SENDER_NUMBER}`,
    ContentSid: TWILIO_CONTENT_SID,
    ContentVariables: JSON.stringify({ '1': otp }),
  });

  const response = await fetchImpl(TWILIO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    logger.error(
      { provider: 'twilio', mobile: maskMobile(mobile), status: response.status, responseBody },
      'Twilio WhatsApp OTP delivery failed',
    );
    throw new Error(TWILIO_ERRORS.deliveryFailed(response.status));
  }
  logger.info({ provider: 'twilio', mobile: maskMobile(mobile), status: response.status }, 'WhatsApp OTP sent successfully');
}

/**
 * Internal: runs the primary → fallback SMS provider retry loop.
 * Returns `{ ok, provider, attempts, errors? }`.
 */
async function _sendViaSmsProviders(mobile, otp, opts = {}) {
  const providers = opts.providers || SMS_PROVIDERS;
  const primary = opts.primary || process.env.SMS_PRIMARY_PROVIDER || 'kaleyra';
  const fallback = opts.fallback || process.env.SMS_FALLBACK_PROVIDER || 'smsstriker';
  const maxRetries = Number.isFinite(opts.maxRetries)
    ? opts.maxRetries
    : parseInt(process.env.OTP_SEND_MAX_RETRIES || '2', 10);

  const order = [primary, fallback].filter((p, i, arr) => p && arr.indexOf(p) === i && providers[p]);
  if (order.length === 0) {
    const msg = 'No SMS providers configured';
    logger.error(msg);
    return { ok: false, errors: [{ provider: null, message: msg }] };
  }

  const errors = [];
  let totalAttempts = 0;
  for (const provider of order) {
    const sender = providers[provider];
    let attempt = 0;
    while (attempt <= maxRetries) {
      totalAttempts++;
      try {
        logger.info(`OTP send attempt provider=${provider} try=${attempt + 1} mobile=${maskMobile(mobile)}`);
        await sender(mobile, otp, opts);
        logger.info(`OTP delivered provider=${provider} mobile=${maskMobile(mobile)}`);
        return { ok: true, provider, attempts: totalAttempts };
      } catch (err) {
        attempt++;
        const message = err && err.message ? err.message : String(err);
        if (attempt > maxRetries) {
          logger.error(`Provider exhausted provider=${provider} attempts=${attempt} err=${message}`);
          errors.push({ provider, attempts: attempt, message });
          break;
        }
        logger.warn(`Retry provider=${provider} attempt=${attempt}/${maxRetries} err=${message}`);
      }
    }
  }
  return { ok: false, attempts: totalAttempts, errors };
}

/**
 * Internal: dispatches via Twilio WhatsApp, respecting the WHATS_OTP_SEND kill switch.
 * Returns `{ ok, provider, attempts, error? }`.
 */
async function _sendViaWhatsApp(mobile, otp, opts = {}) {
  if (process.env.WHATS_OTP_SEND === 'false') {
    logger.warn(`WhatsApp OTP send disabled via WHATS_OTP_SEND=false for ${maskMobile(mobile)}`);
    return { ok: false, provider: 'twilio', attempts: 0, error: 'WhatsApp send disabled' };
  }
  try {
    await sendWhatsAppTwilio(mobile, otp, opts);
    return { ok: true, provider: 'twilio', attempts: 1 };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    logger.error(`WhatsApp OTP delivery failed mobile=${maskMobile(mobile)} err=${message}`);
    return { ok: false, provider: 'twilio', attempts: 1, error: message };
  }
}

/**
 * Dispatches an OTP to a mobile number across one or more channels.
 *
 * Channels (opts.channels, default `['sms']`):
 *   - `'sms'`       — tries SMS_PRIMARY_PROVIDER then SMS_FALLBACK_PROVIDER with retries.
 *   - `'whatsapp'`  — sends via Twilio WhatsApp (respects WHATS_OTP_SEND kill switch).
 *   - `'email'`     — not yet implemented; logged as a warning and skipped.
 *
 * Global skip conditions (unless opts.force = true):
 *   - NODE_ENV is development / staging / test
 *   - OTP_SEND_ENABLED=false
 *
 * Returns `{ ok, provider, attempts, channels, skipped? }`.
 *   `ok` is true when at least one channel delivered the OTP.
 *   `provider` / `attempts` reflect the first successful channel (legacy compat).
 *
 * @param {string} mobile - E.164 mobile number (use `parseMobile()` first).
 * @param {string} otp
 * @param {{ channels?: string[], providers?: Record<string, Function>, primary?: string, fallback?: string, maxRetries?: number, force?: boolean }} [opts]
 */
async function sendOtp(mobile, otp, opts = {}) {
  const enabled = process.env.OTP_SEND_ENABLED !== 'false';
  if (!opts.force && (DEV_LIKE_ENVS.has(process.env.NODE_ENV) || !enabled)) {
    logger.warn(`OTP send skipped (env=${process.env.NODE_ENV} enabled=${enabled}) mobile=${maskMobile(mobile)}`);
    return { ok: true, skipped: true, provider: null, attempts: 0, channels: {} };
  }

  const requestedChannels = Array.isArray(opts.channels) && opts.channels.length > 0
    ? opts.channels
    : ['sms'];

  const channelResults = {};
  let legacyProvider = null;
  let legacyAttempts = 0;

  if (requestedChannels.includes('sms')) {
    const result = await _sendViaSmsProviders(mobile, otp, opts);
    channelResults.sms = result;
    if (result.ok && !legacyProvider) {
      legacyProvider = result.provider;
      legacyAttempts += result.attempts || 0;
    }
  }

  if (requestedChannels.includes('whatsapp')) {
    const result = await _sendViaWhatsApp(mobile, otp, opts);
    channelResults.whatsapp = result;
    if (result.ok && !legacyProvider) {
      legacyProvider = result.provider;
      legacyAttempts += result.attempts || 0;
    }
  }

  if (requestedChannels.includes('email')) {
    logger.warn(`Email OTP channel not yet implemented for ${maskMobile(mobile)}`);
    channelResults.email = { ok: false, error: 'Email channel not yet implemented' };
  }

  const anyOk = Object.values(channelResults).some((r) => r.ok);
  if (!anyOk) {
    logger.error(`All OTP channels failed mobile=${maskMobile(mobile)} channels=${requestedChannels.join(',')}`);
  }

  return {
    ok: anyOk,
    provider: legacyProvider,
    attempts: legacyAttempts,
    channels: channelResults,
  };
}

module.exports = {
  generateOtp,
  generateShortId,
  parseExpiryToMs,
  parseMobile,
  maskMobile,
  buildSmsBody,
  sendSmsKaleyra,
  sendSmsSmsStriker,
  sendWhatsAppTwilio,
  SMS_PROVIDERS,
  sendOtp,
};
