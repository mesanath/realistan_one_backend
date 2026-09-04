'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');
const PropertyVerificationRequest = require('../../realestate/models/PropertyVerificationRequest');
// AuditLog/notification.service.js are serveease-owned models/services, but AuditLog is the only
// audit log in the codebase (its `type` enum is a generic catch-all, `admin_action` already
// covers unrelated admin mutations) and notification.service.js's `notify` object is the
// established in-app-notification pattern — reused here rather than building parallel ones for
// the realestate side. See reviewSkillRequest in modules/serveease/controllers/admin.controller.js
// for the exact pattern this copies.
const AuditLog = require('../../serveease/models/AuditLog');
const { notify } = require('../../serveease/services/notification.service');

// GET /api/v1/realestate-admin/properties/verification?status=pending&page=&limit=
exports.getVerificationRequests = async (req, res, next) => {
    try {
        const { status = 'pending', page = 1, limit = 50 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [data, total] = await Promise.all([
            PropertyVerificationRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            PropertyVerificationRequest.countDocuments(filter),
        ]);

        return res.json({ success: true, data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (e) { next(e); }
};

// GET /api/v1/realestate-admin/properties/verification/:id
exports.getVerificationRequestById = async (req, res, next) => {
    try {
        const request = await PropertyVerificationRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Verification request not found' });

        const db = connectToDatabase();
        const property = await db.collection('properties').findOne(
            { propertyID: request.propertyID },
            { projection: { title: 1, location: 1, city: 1, propertyID: 1 } }
        );

        return res.json({ success: true, data: { request, property } });
    } catch (e) { next(e); }
};

// PATCH /api/v1/realestate-admin/properties/verification/:id
// body: { action: 'approve'|'reject', note? }
exports.reviewVerificationRequest = async (req, res, next) => {
    try {
        const { action, note } = req.body;
        const request = await PropertyVerificationRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Verification request not found' });
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already reviewed' });
        }

        const db = connectToDatabase();
        const propertiesDB = db.collection('properties');

        if (action === 'approve') {
            await propertiesDB.updateOne(
                { propertyID: request.propertyID },
                { $set: { isVerified: true, verifiedAt: +new Date() } }
            );
            await request.updateOne({ status: 'verified', reviewedBy: req.user.userID, reviewedAt: new Date() });
            // AuditLog.userId is typed ObjectId (every other caller is a real Mongoose _id) —
            // realestate-admin's req.user.userID is a custom string id (see PropertyVerificationRequest's
            // reviewedBy field for the same distinction), so it can't go in that field without a
            // CastError. Recorded in meta instead, which is Mixed and imposes no shape.
            await AuditLog.create({
                type: 'property_verification_reviewed', role: 'admin',
                meta: { action: 'approve_property_verification', requestId: request._id, propertyID: request.propertyID, adminUserID: req.user.userID },
            });
        } else {
            await request.updateOne({ status: 'rejected', reviewNote: note || '', reviewedBy: req.user.userID, reviewedAt: new Date() });
            await AuditLog.create({
                type: 'property_verification_reviewed', role: 'admin',
                meta: { action: 'reject_property_verification', requestId: request._id, propertyID: request.propertyID, note, adminUserID: req.user.userID },
            });
        }

        // Fire-and-forget, same as skillRequestReviewed — a notification hiccup must never mask
        // a successful review.
        notify.propertyVerificationReviewed(request.ownerId, action === 'approve', { propertyID: request.propertyID })
            .catch(() => {});

        return res.json({ success: true, message: `Request ${action}d` });
    } catch (e) { next(e); }
};
