'use strict';
const request = require('supertest');
const {
    getApp, seedOtp, getAuthToken,
    cleanupTestUser,
    TEST_MOBILE, TEST_OTP,
} = require('./helpers/setup');

describe('Auth — OTP login flow', () => {
    beforeEach(async () => {
        await cleanupTestUser();
    });

    afterAll(async () => {
        await cleanupTestUser();
    });

    // ── Send OTP ──────────────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/loginbymobile', () => {
        it('returns success when mobile is provided', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile')
                .send({ mobile: TEST_MOBILE, otp: '', whatsappFlag: false });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 400 when mobile is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile')
                .send({ whatsappFlag: false });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('delegates to verifyOtp when otp is present in body', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile')
                .send({ mobile: TEST_MOBILE, otp: TEST_OTP, whatsappFlag: false });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.token).toBe('string');
        });
    });

    // ── Verify OTP ────────────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/loginbymobile/verify', () => {
        it('returns token and sets authToken cookie on valid OTP', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile/verify')
                .send({ mobile: TEST_MOBILE, otp: TEST_OTP, whatsappFlag: false });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.token).toBe('string');
            expect(res.body.mobile).toBe(TEST_MOBILE);
            // Cookie should be set
            const cookies = res.headers['set-cookie'] || [];
            expect(cookies.some(c => c.startsWith('authToken='))).toBe(true);
        });

        it('returns 400 on wrong OTP', async () => {
            await seedOtp();
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile/verify')
                .send({ mobile: TEST_MOBILE, otp: '000000', whatsappFlag: false });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when mobile is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile/verify')
                .send({ otp: TEST_OTP });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when OTP length < 6', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/auth/loginbymobile/verify')
                .send({ mobile: TEST_MOBILE, otp: '123' });
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
            // Bug fix: key must be "data", not "user"
            expect(res.body.data).toBeDefined();
            expect(res.body.user).toBeUndefined();
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

            // Verify persisted
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

    // ── Logout ────────────────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/auth/logout', () => {
        it('clears authToken cookie', async () => {
            const res = await request(getApp()).post('/api/v1/realestate/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const cookies = res.headers['set-cookie'] || [];
            // Cookie should be cleared (Max-Age=0 or Expires in the past)
            expect(cookies.some(c => c.startsWith('authToken=;') || c.includes('Max-Age=0'))).toBe(true);
        });
    });
});
