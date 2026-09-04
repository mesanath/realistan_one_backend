'use strict';
const { db } = require('../../../src/utils/dbs');
const { uploadToS3, DOCUMENT_MIME_TYPES } = require('../../../src/services/s3Upload.service');
const PropertyVerificationRequest = require('../models/PropertyVerificationRequest');

// POST /api/v1/realestate/properties/verification/upload
// multipart/form-data: propertyID, documentType fields + `file`.
// Owner-only (ownership check mirrors deleteProperty's pattern in property.controller.js).
// Upserts the owner's PropertyVerificationRequest, appending the new document and resetting
// status to 'pending' if it had previously been rejected (a resubmission after fixing an issue).
exports.uploadVerificationDocument = async (req, res) => {
    try {
        const { propertyID, documentType } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });
        if (!PropertyVerificationRequest.DOCUMENT_TYPES.includes(documentType)) {
            return res.status(400).json({ success: false, message: `documentType must be one of: ${PropertyVerificationRequest.DOCUMENT_TYPES.join(', ')}` });
        }
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const propertiesDB = db.get().collection('properties');
        const property = await propertiesDB.findOne({ propertyID, isDeleted: { $ne: true } });
        if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
        if (String(property.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorised to verify this property' });
        }

        const url = await uploadToS3(req.file.buffer, req.file.mimetype, `property-verification/${propertyID}`, DOCUMENT_MIME_TYPES);

        const existing = await PropertyVerificationRequest.findOne({ propertyID });
        const wasRejected = existing?.status === 'rejected';

        const request = await PropertyVerificationRequest.findOneAndUpdate(
            { propertyID },
            {
                $push: { documents: { type: documentType, url, uploadedAt: new Date() } },
                $setOnInsert: { ownerId: req.user._id },
                ...(wasRejected ? { $set: { status: 'pending', reviewNote: '', reviewedBy: null, reviewedAt: null } } : {}),
            },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: 'Document uploaded', data: request });
    } catch (error) {
        console.error('uploadVerificationDocument error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

// POST /api/v1/realestate/properties/verification/status
// body: { propertyID } — owner-only, returns their own verification request (or null if none
// submitted yet) so the "Get Verified" UI knows what state to render.
exports.getVerificationStatus = async (req, res) => {
    try {
        const { propertyID } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });

        const propertiesDB = db.get().collection('properties');
        const property = await propertiesDB.findOne({ propertyID, isDeleted: { $ne: true } });
        if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
        if (String(property.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorised to view this property\'s verification status' });
        }

        const request = await PropertyVerificationRequest.findOne({ propertyID });
        return res.json({ success: true, data: request });
    } catch (error) {
        console.error('getVerificationStatus error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};
