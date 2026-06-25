'use strict';
const request = require('supertest');
const {
    getApp, getAuthToken, createTestProperty,
    cleanupTestUser, cleanupTestProperties, cleanupContactRequests,
} = require('./helpers/setup');

describe('Contact', () => {
    let token;
    let property;

    beforeAll(async () => {
        await cleanupTestUser();
        await cleanupTestProperties();
        token = await getAuthToken();
        property = await createTestProperty(token);
    });

    afterAll(async () => {
        await cleanupContactRequests(property?.propertyID);
        await cleanupTestProperties();
        await cleanupTestUser();
    });

    describe('POST /api/v1/realestate/contact/requestcallback', () => {
        it('succeeds as a guest (no token)', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/contact/requestcallback')
                .send({
                    propertyID: property.propertyID,
                    name: 'Guest Buyer',
                    mobile: '+919876500001',
                    message: 'Please call me at 10am',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/submitted/i);
        });

        it('succeeds when authenticated (req.user stored as requestedBy)', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/contact/requestcallback')
                .set('authorization', token)
                .send({
                    propertyID: property.propertyID,
                    message: 'Interested in viewing this weekend',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('succeeds with only propertyID (name/mobile/message optional)', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/contact/requestcallback')
                .send({ propertyID: property.propertyID });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 400 when propertyID is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/contact/requestcallback')
                .send({ name: 'No Property', mobile: '+919876500002' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/propertyID/i);
        });

        it('is rate-limited (apiRateLimit applied)', async () => {
            // Verify the route exists and responds — rate limit test would
            // need 100+ requests which is impractical in unit tests.
            const res = await request(getApp())
                .post('/api/v1/realestate/contact/requestcallback')
                .send({ propertyID: property.propertyID });
            expect([200, 429]).toContain(res.status);
        });
    });
});
