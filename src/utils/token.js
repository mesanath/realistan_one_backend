'use strict';
/**
 * Single JWT scheme for the whole backend — realestate and serveease both verify
 * tokens issued here. Replaces the old split (realestate: JWT_ACCESS_TOKEN_SECRET,
 * long-lived, no refresh / serveease: JWT_SECRET, access+refresh).
 *
 * Signs with JWT_SECRET. Verifies against JWT_SECRET first, then falls back to
 * JWT_ACCESS_TOKEN_SECRET so tokens issued by the old realestate flow (and any
 * deploy that hasn't consolidated its env vars yet) keep working during rollout —
 * in this repo's own .env files the two are already the same value.
 */
const jwt = require('jsonwebtoken');

const SECRETS = [process.env.JWT_SECRET, process.env.JWT_ACCESS_TOKEN_SECRET].filter(Boolean);

/**
 * @param {{ id: string, phone?: string, role?: string, screenName?: string }} payload
 * @returns {{ access: string, refresh: string }}
 */
exports.signAuthTokens = ({ id, phone, role = 'customer', screenName }) => {
    const base = { id, _id: id, phone, mobile: phone, role, screenName };
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_TOKEN_SECRET;
    const access = jwt.sign(base, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '1d' });
    const refresh = jwt.sign(base, secret, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' });
    return { access, refresh };
};

/**
 * Verifies a token against whichever configured secret matches. Throws on failure —
 * callers already wrap auth in try/catch (see the auth middlewares).
 */
exports.verifyAuthToken = (token) => {
    let lastErr;
    for (const secret of SECRETS) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('No JWT secret configured');
};
