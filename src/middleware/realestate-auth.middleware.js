'use strict';
const { verifyToken } = require('../utils/jwt');

exports.authenticate = async (req, res, next) => {
    try {
        // Cookie takes priority (web sessions); fall back to Bearer header (API / mobile clients)
        let token = req.cookies?.realistoken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ success: false, message: 'Authorization missing' });
            }
            token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        }

        const decoded = await verifyToken({ authorization: token });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Populates req.user if a valid token is present; otherwise continues with req.user = null
exports.authenticateOptional = async (req, res, next) => {
    try {
        let token = req.cookies?.realistoken;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader) {
                token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
            }
        }
        if (token) {
            const decoded = await verifyToken({ authorization: token });
            req.user = decoded;
        } else {
            req.user = null;
        }
    } catch {
        req.user = null;
    }
    next();
};
