/**
 * Integration tests for health check endpoints.
 * Runs against in-memory MongoDB (set up in jest.globalSetup).
 */
const request = require('supertest');
const { connectTestDb, closeTestDb } = require('./test-utils/db');

let app;

beforeAll(async () => {
  process.env.PORT = '0';
  await connectTestDb();
  // Import app AFTER DB connected so Mongoose is wired
  app = require('../../../src/app');
});

afterAll(async () => {
  await closeTestDb();
});

describe('GET /health/live', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /health', () => {
  it('redirects to /health/live', async () => {
    const res = await request(app).get('/health');
    expect([200, 307]).toContain(res.status);
  });
});

describe('Auth routes', () => {
  it('POST /api/v1/serveease/auth/send-otp rejects missing phone', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/auth/send-otp')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/serveease/auth/send-otp rejects invalid phone format', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/auth/send-otp')
      .send({ phone: '12345' });
    expect(res.status).toBe(400);
  });
});

describe('Service routes', () => {
  it('GET /api/v1/serveease/services/categories returns success', async () => {
    const res = await request(app).get('/api/v1/serveease/services/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/v1/serveease/services returns paginated list', async () => {
    const res = await request(app).get('/api/v1/serveease/services');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});
