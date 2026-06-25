'use strict';
const jwt = require('jsonwebtoken');

const decodeToken = (authorization) => {
    const token = typeof authorization !== 'undefined'
        ? (authorization || '').replace('BEARER ', '').replace('Bearer ', '')
        : '';
    if (!token) return null;
    // Try JWT_SIG first (legacy + default), then JWT_ADMIN_SECRET if configured separately
    try {
        return jwt.verify(token, process.env.JWT_SIG);
    } catch {
        const adminSecret = process.env.JWT_ADMIN_SECRET;
        if (adminSecret && adminSecret !== process.env.JWT_SIG) {
            return jwt.verify(token, adminSecret);
        }
        throw new Error('Invalid token');
    }
};

exports.authenticate = (req, res, next) => {
    try {
        let token = req.cookies?.authToken;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ success: false, message: 'Authorization missing' });
            }
            token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        }
        const user = decodeToken(token);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

exports.requireAccess = (accessLevel, type) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const access = type === 'read'
        ? (req.user.readAccess || [])
        : (req.user.writeAccess || []);
    if (access.indexOf(accessLevel) === -1) {
        return res.status(403).json({ success: false, message: 'Action not allowed' });
    }
    next();
};
