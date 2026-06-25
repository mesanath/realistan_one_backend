'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { connectToDatabase } = require('../services/databaseConnections');
const logger = require('../utils/logger');

const SUPER_ADMIN_COLLECTION = 'superAdmins';
const LEGACY_ADMIN_COLLECTION = 'new_admin';

const OTP_TTL_MS = 5 * 60 * 1000;
const IS_DEV = () => process.env.NODE_ENV !== 'production';

// In-memory OTP store — swap for Redis in multi-instance deployments
const otpStore = new Map();

const generateOtp = () => {
    const bytes = crypto.randomBytes(3);
    return String(parseInt(bytes.toString('hex'), 16)).slice(0, 6).padEnd(6, '0');
};

const getAdminSecret = () => process.env.JWT_ADMIN_SECRET || process.env.JWT_SIG;

const signAdminToken = (admin) =>
    jwt.sign(
        {
            userID: admin.userID || String(admin._id),
            phone: admin.phone || '',
            email: admin.email || '',
            role: 'admin',
            readAccess: admin.readAccess || ['User', 'Articles'],
            writeAccess: admin.writeAccess || ['User', 'Articles'],
            isSuperAdmin: true,
        },
        getAdminSecret()
    );

/**
 * POST /api/v1/admin-auth/send-otp
 * body: { phone }
 * Sends OTP to a registered super admin phone number.
 * In non-production, devOtp is returned in the response.
 */
exports.sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

        const cleanPhone = String(phone).replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return res.status(400).json({ success: false, message: 'Invalid phone number' });
        }

        const adminDB = connectToDatabase().collection(SUPER_ADMIN_COLLECTION);
        const admin = await adminDB.findOne({ phone: cleanPhone });
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const otp = IS_DEV()
            ? (process.env.SUPER_ADMIN_OTP || '964321')
            : generateOtp();

        otpStore.set(cleanPhone, { otp, expiresAt: Date.now() + OTP_TTL_MS });

        if (!IS_DEV()) {
            // Production: send real SMS here
            logger.info(`Admin OTP dispatched to ${cleanPhone.slice(-4).padStart(cleanPhone.length, '*')}`);
        }

        return res.json({
            success: true,
            message: 'OTP sent',
            ...(IS_DEV() && { devOtp: otp }),
        });
    } catch (err) {
        logger.error(`Admin sendOtp error: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/v1/admin-auth/verify-otp
 * body: { phone, otp }
 * Returns a unified admin JWT valid for both realestate-admin and serveease-admin panels.
 */
exports.verifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP required' });
        }

        const cleanPhone = String(phone).replace(/\D/g, '');
        const devOtp = process.env.SUPER_ADMIN_OTP || '964321';

        // In dev mode, the hardcoded dev OTP always works without requiring send-otp first.
        // This avoids the in-memory store being wiped by hot-reloads between the two calls.
        const isDevBypass = IS_DEV() && String(otp) === devOtp;

        if (!isDevBypass) {
            const stored = otpStore.get(cleanPhone);
            if (!stored) {
                return res.status(400).json({ success: false, message: 'OTP not requested or expired. Call send-otp first.' });
            }
            if (Date.now() > stored.expiresAt) {
                otpStore.delete(cleanPhone);
                return res.status(400).json({ success: false, message: 'OTP expired' });
            }
            if (stored.otp !== String(otp)) {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }
        }

        otpStore.delete(cleanPhone);

        const adminDB = connectToDatabase().collection(SUPER_ADMIN_COLLECTION);
        const admin = await adminDB.findOne({ phone: cleanPhone });
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Admin not found' });
        }

        const token = signAdminToken(admin);

        return res.json({
            success: true,
            token,
            admin: {
                email: admin.email,
                phone: admin.phone,
                readAccess: admin.readAccess || ['User', 'Articles'],
                writeAccess: admin.writeAccess || ['User', 'Articles'],
            },
        });
    } catch (err) {
        logger.error(`Admin verifyOtp error: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/v1/admin-auth/login
 * body: { email, password }
 * Email + password login — checks superAdmins first, then legacy new_admin collection.
 * Returns the same unified admin JWT as verify-otp.
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const superDB = connectToDatabase().collection(SUPER_ADMIN_COLLECTION);
        const legacyDB = connectToDatabase().collection(LEGACY_ADMIN_COLLECTION);

        // Check superAdmins first, then legacy new_admin
        let adminUser = await superDB.findOne({ email });
        if (!adminUser) adminUser = await legacyDB.findOne({ email: email });

        if (!adminUser) {
            return res.status(401).json({ success: false, message: 'No user found' });
        }

        if (!adminUser.password) {
            return res.status(401).json({ success: false, message: 'Password login not enabled. Use OTP.' });
        }

        const match = await bcrypt.compare(password, adminUser.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Password does not match' });
        }

        const token = signAdminToken(adminUser);

        return res.json({
            success: true,
            token,
            userName: adminUser.authername || adminUser.email,
            readAccess: adminUser.readAccess || ['User', 'Articles'],
        });
    } catch (err) {
        logger.error(`Admin login error: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
};
