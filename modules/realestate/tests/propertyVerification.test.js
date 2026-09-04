'use strict';
/**
 * Integration tests for the Verified Listings feature (strategic-roadmap.md #2):
 *   - POST /realestate/properties/verification/upload  (owner uploads a document)
 *   - POST /realestate/properties/verification/status   (owner checks their own request)
 *   - GET/PATCH /realestate-admin/properties/verification[/:id]  (admin review queue)
 *
 * Boots the real server (both native-driver and Mongoose connections) via the same helper
 * modules/realestate/tests/properties.test.js uses, since propertyVerification.controller.js
 * (owner side) and its realestate-admin counterpart both mix native-driver `properties` lookups
 * with the Mongoose PropertyVerificationRequest model — a real DB is far simpler here than
 * mocking both layers coherently.
 */
const request = require('supertest');
const {
    getApp, getAuthToken, createTestProperty,
    cleanupTestUser, cleanupTestProperties, ensureReady,
} = require('./helpers/setup');
const { generateToken, generateNoAccessToken } = require('../../realestate-admin/tests/helpers/token.helper');
const PropertyVerificationRequest = require('../models/PropertyVerificationRequest');
const { db } = require('../../../src/utils/dbs');

const ADMIN_TOKEN = generateToken({
    readAccess: ['PropertyVerification'],
    writeAccess: ['PropertyVerification'],
});
const ADMIN_NO_ACCESS_TOKEN = generateNoAccessToken();

describe('Verified Listings', () => {
    let ownerToken;
    let property;

    beforeAll(async () => {
        await cleanupTestUser();
        await cleanupTestProperties();
        ownerToken = await getAuthToken();
        property = await createTestProperty(ownerToken);
    });

    afterAll(async () => {
        await ensureReady();
        await PropertyVerificationRequest.deleteMany({ propertyID: property.propertyID });
        await cleanupTestProperties();
        await cleanupTestUser();
    });

    describe('POST /api/v1/realestate/properties/verification/upload', () => {
        it('returns 401 with no auth token', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/verification/upload')
                .field('propertyID', property.propertyID)
                .field('documentType', 'title_deed');
            expect(res.status).toBe(401);
        });

        it('returns 400 for an invalid documentType', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/verification/upload')
                .set('authorization', ownerToken)
                .field('propertyID', property.propertyID)
                .field('documentType', 'not_a_real_type')
                .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'deed.pdf', contentType: 'application/pdf' });
            expect(res.status).toBe(400);
        });

        it('uploads a document and creates a pending request', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/verification/upload')
                .set('authorization', ownerToken)
                .field('propertyID', property.propertyID)
                .field('documentType', 'title_deed')
                .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'deed.pdf', contentType: 'application/pdf' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('pending');
            expect(res.body.data.documents).toHaveLength(1);
            expect(res.body.data.documents[0].type).toBe('title_deed');
        });

        it('rejects an upload for a property the caller does not own', async () => {
            // A second owner account, distinct from the one that created `property` above.
            const { storeOtp } = require('../../../src/auth/otpEngine');
            await storeOtp('+919000000002', '654321');
            const otherLogin = await request(getApp())
                .post('/api/v1/auth/verify-otp')
                .send({ mobile: '+919000000002', otp: '654321' });
            const otherToken = otherLogin.body.tokens?.access || otherLogin.body.token;

            const res = await request(getApp())
                .post('/api/v1/realestate/properties/verification/upload')
                .set('authorization', otherToken)
                .field('propertyID', property.propertyID)
                .field('documentType', 'rera')
                .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'rera.pdf', contentType: 'application/pdf' });

            expect(res.status).toBe(403);

            const User = require('../../../src/models/User');
            await User.deleteMany({ phone: '+919000000002' });
        });
    });

    describe('POST /api/v1/realestate/properties/verification/status', () => {
        it('returns the owner\'s own request', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/verification/status')
                .set('authorization', ownerToken)
                .send({ propertyID: property.propertyID });
            expect(res.status).toBe(200);
            expect(res.body.data.propertyID).toBe(property.propertyID);
            expect(res.body.data.status).toBe('pending');
        });
    });

    describe('GET /api/v1/realestate-admin/properties/verification', () => {
        it('returns 401 with no token', async () => {
            const res = await request(getApp()).get('/api/v1/realestate-admin/properties/verification');
            expect(res.status).toBe(401);
        });

        it('returns 403 without PropertyVerification access', async () => {
            const res = await request(getApp())
                .get('/api/v1/realestate-admin/properties/verification')
                .set('Authorization', `Bearer ${ADMIN_NO_ACCESS_TOKEN}`);
            expect(res.status).toBe(403);
        });

        it('lists the pending request created above', async () => {
            const res = await request(getApp())
                .get('/api/v1/realestate-admin/properties/verification?status=pending')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
            expect(res.status).toBe(200);
            expect(res.body.data.some((r) => r.propertyID === property.propertyID)).toBe(true);
        });
    });

    describe('PATCH /api/v1/realestate-admin/properties/verification/:id', () => {
        it('approves the request and sets isVerified on the property', async () => {
            const requestDoc = await PropertyVerificationRequest.findOne({ propertyID: property.propertyID });

            const res = await request(getApp())
                .patch(`/api/v1/realestate-admin/properties/verification/${requestDoc._id}`)
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ action: 'approve' });

            expect(res.status).toBe(200);

            const updated = await PropertyVerificationRequest.findById(requestDoc._id);
            expect(updated.status).toBe('verified');
            expect(updated.reviewedBy).toBe('user123'); // token.helper.js's default userID

            const propertyDoc = await db.get().collection('properties').findOne({ propertyID: property.propertyID });
            expect(propertyDoc.isVerified).toBe(true);
        });

        it('400s reviewing an already-reviewed request', async () => {
            const requestDoc = await PropertyVerificationRequest.findOne({ propertyID: property.propertyID });
            const res = await request(getApp())
                .patch(`/api/v1/realestate-admin/properties/verification/${requestDoc._id}`)
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ action: 'approve' });
            expect(res.status).toBe(400);
        });
    });
});
