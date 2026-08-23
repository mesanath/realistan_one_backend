/**
 * Covers the ServeEase admin role split introduced in constants/adminRoles.js
 * and modules/serveease/routes/admin.routes.js: 'admin' and 'operations' get
 * identical full access (ServeEase has no admin-console-user-creation concept
 * to exclude 'operations' from); 'customer_services_management' is scoped
 * down to the "reply / update status" surface only (bookings list + status
 * update, customers/agents read for context) and must be rejected everywhere
 * else (agent management, coupons, zones, settings, ...).
 */
jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');
const app = require('../../../src/app');

const signToken = (serveeaseRole) =>
  jwt.sign({ userID: new mongoose.Types.ObjectId().toString(), role: 'Product', serveeaseRole }, process.env.JWT_SIG);

const operationsToken = signToken('operations');
const csToken = signToken('customer_services_management');

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe('ServeEase admin role gating', () => {
  it('operations can reach a FULL-only route (settings)', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/admin/settings')
      .set('Authorization', `Bearer ${operationsToken}`);
    expect(res.status).not.toBe(403);
  });

  it('customer_services_management is rejected from a FULL-only route (settings)', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/admin/settings')
      .set('Authorization', `Bearer ${csToken}`);
    expect(res.status).toBe(403);
  });

  it('customer_services_management is rejected from agent management (create agent)', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/admin/agents')
      .set('Authorization', `Bearer ${csToken}`)
      .send({ name: 'Test Agent', phone: '9999999999' });
    expect(res.status).toBe(403);
  });

  it('customer_services_management CAN reach the CS-permitted surface (bookings list)', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/admin/bookings')
      .set('Authorization', `Bearer ${csToken}`);
    expect(res.status).not.toBe(403);
  });

  it('customer_services_management CAN update a booking status (the "update status" permission)', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/admin/bookings/000000000000000000000000')
      .set('Authorization', `Bearer ${csToken}`)
      .send({ status: 'completed' });
    // Not seeded, so the underlying booking won't exist — what matters here is
    // that the role gate itself did not reject the request.
    expect(res.status).not.toBe(403);
  });

  it('customer_services_management cannot reassign an agent on a booking (FULL-only)', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/admin/bookings/000000000000000000000000/assign-agent')
      .set('Authorization', `Bearer ${csToken}`)
      .send({ agentId: '000000000000000000000000' });
    expect(res.status).toBe(403);
  });
});
