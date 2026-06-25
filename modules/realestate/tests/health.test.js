'use strict';
const request = require('supertest');
const { getApp } = require('./helpers/setup');

describe('Health endpoints', () => {
    it('GET /health returns status ok', async () => {
        const res = await request(getApp()).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(typeof res.body.uptime).toBe('number');
    });

    it('GET /api/v1/health returns status ok', async () => {
        const res = await request(getApp()).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('Unknown route returns 404', async () => {
        const res = await request(getApp()).get('/api/v1/doesnotexist');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
