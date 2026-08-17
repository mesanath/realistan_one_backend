'use strict';
const request = require('supertest');
const {
    getApp, seedOtp, getAuthToken,
    cleanupTestUser,
    TEST_MOBILE, TEST_OTP,
} = require('./helpers/setup');

describe('Auth — one shared login system (realestate + serveease)', () => {
    beforeEach(async () => {
        await cleanupTestUser();
    });

    afterAll(async () => {
        await cleanupTestUser();
    });

    // ── Send OTP (unified — same endpoint serveease uses) ───────────────────────
    describe('POST /api/v1/auth/send-otp', () => {
        it('returns success when mobile is provided', async () => {
            const res = await request(getApp())
                .post('/api/v1/auth/send-otp')
                .send({ mobile: TEST_MOBILE });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 400 when mobile is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/auth/send-otp')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns the hardcoded dev OTP outside production', async () => {
            const res = await request(getApp())
                .post('/api/v1/auth/send-otp')
                .send({ mobile: TEST_MOBILE });
            expect(res.body.devOtp).toBe('123456');
        });

        it('accepts a separate countryCode + phone pair', async () => {
            const res = await request(getApp())
                .post('/api/v1/auth/send-otp')
                .send({ countryCode: '91', phone: '9000000001' });
            expect(res.status).toBe(200);
            expect(res.body.mobile).toBe(TEST_MOBILE);
        });
    });

    // ── Verify OTP ────────────────────────────────────────────────────────────
    describe('POST /api/v1/auth/verify-otp', () => {
        it('returns tokens on valid OTP', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/auth/verify-otp')
                .send({ mobile: TEST_MOBILE, otp: TEST_OTP });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.tokens.access).toBe('string');
            expect(typeof res.body.tokens.refresh).toBe('string');
            expect(res.body.token).toBe(res.body.tokens.access); // legacy flat field
            expect(res.body.mobile).toBe(TEST_MOBILE);
        });

        it('returns 400 on wrong OTP', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/auth/verify-otp')
                .send({ mobile: TEST_MOBILE, otp: '000000' });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when mobile is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/auth/verify-otp')
                .send({ otp: TEST_OTP });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    // ── Get profile ───────────────────────────────────────────────────────────
    describe('GET /api/v1/realestate/auth/getprofile', () => {
        it('returns profile with data key (not user key)', async () => {
            const token = await getAuthToken();
            const res = await request(getApp())
                .get('/api/v1/realestate/auth/getprofile')
                .set('authorization', token);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.user).toBeUndefined();
            expect(res.body.data.phone).toBe(TEST_MOBILE);
            expect(res.body.data.mobile).toBe(TEST_MOBILE);
        });

        it('returns 401 without token', async () => {
            const res = await request(getApp()).get('/api/v1/realestate/auth/getprofile');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('returns 401 with invalid token', async () => {
            const res = await request(getApp())
                .get('/api/v1/realestate/auth/getprofile')
                .set('authorization', 'invalid.token.here');
            expect(res.status).toBe(401);
        });
    });

    // ── Update user details ───────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/updateuserdetails', () => {
        it('updates name (screenName) field', async () => {
            const token = await getAuthToken();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/updateuserdetails')
                .set('authorization', token)
                .send({ name: 'Alice Buyer' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const profile = await request(getApp())
                .get('/api/v1/realestate/auth/getprofile')
                .set('authorization', token);
            expect(profile.body.data.screenName).toBe('Alice Buyer');
        });

        it('updates email field', async () => {
            const token = await getAuthToken();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/updateuserdetails')
                .set('authorization', token)
                .send({ email: 'alice@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 401 without token', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/updateuserdetails')
                .send({ name: 'Hack Attempt' });
            expect(res.status).toBe(401);
        });
    });

    // ── Delete account ────────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/deleteaccount', () => {
        it('returns 401 without token', async () => {
            const res = await request(getApp()).post('/api/v1/realestate/auth/deleteaccount');
            expect(res.status).toBe(401);
        });

        it('soft-deletes the account, scrubs PII, and clears the cookie', async () => {
            const token = await getAuthToken();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/deleteaccount')
                .set('authorization', token);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const cookies = res.headers['set-cookie'] || [];
            expect(cookies.some(c => c.startsWith('authToken=;') || c.includes('Max-Age=0'))).toBe(true);

            const profile = await request(getApp())
                .get('/api/v1/realestate/auth/getprofile')
                .set('authorization', token);
            expect(profile.body.data.screenName).toBe('Deleted User');
            expect(profile.body.data.email).toBeUndefined();
        });

        it('returns 400 when the account is already deleted', async () => {
            const token = await getAuthToken();
            await request(getApp()).post('/api/v1/realestate/auth/deleteaccount').set('authorization', token);

            const res = await request(getApp())
                .post('/api/v1/realestate/auth/deleteaccount')
                .set('authorization', token);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('blocks a subsequent OTP login for the deleted account', async () => {
            const token = await getAuthToken();
            await request(getApp()).post('/api/v1/realestate/auth/deleteaccount').set('authorization', token);

            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/auth/verify-otp')
                .send({ mobile: TEST_MOBILE, otp: TEST_OTP });
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    // ── Logout ────────────────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/logout', () => {
        it('clears authToken cookie', async () => {
            const res = await request(getApp()).post('/api/v1/realestate/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const cookies = res.headers['set-cookie'] || [];
            expect(cookies.some(c => c.startsWith('authToken=;') || c.includes('Max-Age=0'))).toBe(true);
        });
    });
});
