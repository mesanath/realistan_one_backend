/**
 * Integration tests for self-service account deletion.
 * Route: DELETE /api/v1/serveease/auth/account
 * Also covers the isDeleted re-login guard in POST /api/v1/serveease/auth/verify-otp.
 */

jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

jest.mock('../config/redis', () => {
  const store = new Map();
  const sets = new Map();
  return {
    connectRedis: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation(async (k) => store.get(k) ?? null),
    set: jest.fn().mockImplementation(async (k, v) => { store.set(k, v); }),
    del: jest.fn().mockImplementation(async (k) => { store.delete(k); }),
    incr: jest.fn().mockImplementation(async (k) => {
      const n = parseInt(store.get(k) || '0') + 1;
      store.set(k, String(n));
      return n;
    }),
    expire: jest.fn().mockResolvedValue(true),
    sadd: jest.fn().mockImplementation(async (k, v) => {
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k).add(v);
    }),
    scard: jest.fn().mockImplementation(async (k) => sets.get(k)?.size ?? 0),
    _store: store,
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');

const User = require('../models/User');
const Agent = require('../models/Agent');

let app;

beforeAll(async () => {
  process.env.PORT = '0';
  await connectTestDb();
  await clearTestDb();
  app = require('../../../src/app');
});

afterAll(async () => {
  await closeTestDb();
});

describe('DELETE /api/v1/serveease/auth/account', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(app).delete('/api/v1/serveease/auth/account');
    expect(res.status).toBe(401);
  });

  it('returns 403 for agent tokens', async () => {
    const agent = await Agent.create({ name: 'Delete Test Agent', phone: '+919833300001', gender: 'male', city: 'Bangalore' });
    const token = jwt.sign({ id: agent._id, phone: agent.phone, role: 'agent' }, process.env.JWT_SECRET);

    const res = await request(app).delete('/api/v1/serveease/auth/account').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('soft-deletes the account and scrubs PII', async () => {
    const user = await User.create({ name: 'Delete Test Customer', phone: '+919833300002', email: 'delete-me@example.com' });
    const token = jwt.sign({ id: user._id, phone: user.phone, role: 'customer' }, process.env.JWT_SECRET);

    const res = await request(app).delete('/api/v1/serveease/auth/account').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated.isDeleted).toBe(true);
    expect(updated.isActive).toBe(false);
    expect(updated.name).toBe('Deleted User');
    expect(updated.email).toBeUndefined();
    expect(updated.deletedAt).toBeInstanceOf(Date);
  });

  it('returns 400 when the account is already deleted', async () => {
    const user = await User.create({ name: 'Delete Test Customer 2', phone: '+919833300003' });
    const token = jwt.sign({ id: user._id, phone: user.phone, role: 'customer' }, process.env.JWT_SECRET);

    await request(app).delete('/api/v1/serveease/auth/account').set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete('/api/v1/serveease/auth/account').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('blocks a subsequent OTP login for the deleted account', async () => {
    const phone = '+919833300004';
    const user = await User.create({ name: 'Delete Test Customer 3', phone });
    const token = jwt.sign({ id: user._id, phone, role: 'customer' }, process.env.JWT_SECRET);

    await request(app).delete('/api/v1/serveease/auth/account').set('Authorization', `Bearer ${token}`);

    const sendRes = await request(app).post('/api/v1/serveease/auth/send-otp').send({ phone });
    expect(sendRes.status).toBe(200);

    const verifyRes = await request(app).post('/api/v1/serveease/auth/verify-otp').send({ phone, otp: sendRes.body.devOtp });
    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.success).toBe(false);
  });
});
