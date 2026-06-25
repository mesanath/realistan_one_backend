/**
 * Integration tests for the full OTP booking flow.
 * Route: POST /api/v1/serveease/bookings/:id/send-start-otp
 *        POST /api/v1/serveease/bookings/:id/verify-start
 *        POST /api/v1/serveease/bookings/:id/send-end-otp
 *        POST /api/v1/serveease/bookings/:id/verify-end
 *
 * Uses MongoMemoryServer (jest.globalSetup) + in-memory Redis mock.
 * OTP_DEV_MODE=true so devOtp is returned in responses.
 */

// Remove rate limiting so sequential verify calls don't get blocked
jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

// Replace Redis with a synchronous in-memory Map so tests don't need a real Redis instance
jest.mock('../config/redis', () => {
  const store = new Map();
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
    _store: store,
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');

const User = require('../models/User');
const Agent = require('../models/Agent');
const Booking = require('../models/Booking');

let app;
let customer;
let agentDoc;
let booking;
let agentToken;

const redisMock = require('../config/redis');

beforeAll(async () => {
  // Use port 0 (random) so tests don't conflict with the dev server on 3001
  process.env.PORT = '0';
  await connectTestDb();
  await clearTestDb();

  // Seed a customer
  customer = await User.create({ name: 'OTP Test Customer', phone: '+919811111111' });

  // Seed an agent (used only for auth token)
  agentDoc = await Agent.create({ name: 'OTP Test Agent', phone: '+919822222222', gender: 'male', city: 'Bangalore' });

  // Create a booking directly in 'arrived' state so send-start-otp is accepted
  booking = await Booking.create({
    customerId: customer._id,
    serviceId: new mongoose.Types.ObjectId(),
    address: { addressLine: '10 Test Lane', city: 'Bangalore', pincode: '560001' },
    scheduledAt: new Date(),
    baseAmount: 500,
    discountAmount: 0,
    finalAmount: 500,
    status: 'arrived',
  });

  agentToken = jwt.sign({ id: agentDoc._id, role: 'agent' }, process.env.JWT_SECRET);

  app = require('../../../src/app');
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(() => {
  // Start each test with a clean Redis store — sequential flow tests share state intentionally
  // (each describe block resets via its own beforeAll/beforeEach where needed)
});

// ─── send-start-otp ───────────────────────────────────────────────────────────

describe('POST /bookings/:id/send-start-otp', () => {
  it('returns 404 for a non-existent booking', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${fakeId}/send-start-otp`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 when booking status is not arrived', async () => {
    const notArrivedBooking = await Booking.create({
      customerId: customer._id,
      serviceId: new mongoose.Types.ObjectId(),
      address: { addressLine: '10 Test Lane', city: 'Bangalore', pincode: '560001' },
      scheduledAt: new Date(),
      baseAmount: 500,
      finalAmount: 500,
      status: 'assigned',
    });

    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${notArrivedBooking._id}/send-start-otp`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 401 with no auth token', async () => {
    const res = await request(app).post(`/api/v1/serveease/bookings/${booking._id}/send-start-otp`);
    expect(res.status).toBe(401);
  });
});

// ─── Full sequential OTP flow ──────────────────────────────────────────────────

describe('Full OTP flow: arrived → in_progress → completed', () => {
  let startOtp;
  let endOtp;

  beforeAll(() => redisMock._store.clear());

  it('send-start-otp: returns 200 with devOtp', async () => {
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/send-start-otp`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.devOtp).toBe('string');
    expect(res.body.devOtp).toMatch(/^\d{6}$/);
    startOtp = res.body.devOtp;
  });

  it('verify-start: returns 400 with wrong OTP', async () => {
    const wrongOtp = startOtp === '000000' ? '111111' : '000000';
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/verify-start`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ otp: wrongOtp });
    expect(res.status).toBe(400);
  });

  it('verify-start: returns 200 and advances booking to in_progress', async () => {
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/verify-start`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ otp: startOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Booking.findById(booking._id);
    expect(updated.status).toBe('in_progress');
  });

  it('send-end-otp: returns 200 with devOtp when in_progress', async () => {
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/send-end-otp`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.devOtp).toBe('string');
    expect(res.body.devOtp).toMatch(/^\d{6}$/);
    endOtp = res.body.devOtp;
  });

  it('verify-end: returns 400 with wrong OTP', async () => {
    const wrongOtp = endOtp === '000000' ? '111111' : '000000';
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/verify-end`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ otp: wrongOtp });
    expect(res.status).toBe(400);
  });

  it('verify-end: returns 200 and advances booking to completed', async () => {
    const res = await request(app)
      .post(`/api/v1/serveease/bookings/${booking._id}/verify-end`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ otp: endOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Booking.findById(booking._id);
    expect(updated.status).toBe('completed');
  });
});

// ─── OTP lockout ──────────────────────────────────────────────────────────────

describe('OTP lockout after MAX_ATTEMPTS wrong entries', () => {
  let lockBooking;
  let lockedAgentToken;
  let correctOtp;

  beforeAll(async () => {
    redisMock._store.clear();

    lockBooking = await Booking.create({
      customerId: customer._id,
      serviceId: new mongoose.Types.ObjectId(),
      address: { addressLine: '10 Lockout Lane', city: 'Bangalore', pincode: '560001' },
      scheduledAt: new Date(),
      baseAmount: 300,
      finalAmount: 300,
      status: 'arrived',
    });

    lockedAgentToken = agentToken;

    // Get the OTP
    const sendRes = await request(app)
      .post(`/api/v1/serveease/bookings/${lockBooking._id}/send-start-otp`)
      .set('Authorization', `Bearer ${lockedAgentToken}`);
    correctOtp = sendRes.body.devOtp;
  });

  it('locks OTP after 3 consecutive wrong attempts', async () => {
    const wrongOtp = correctOtp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 3; i++) {
      const r = await request(app)
        .post(`/api/v1/serveease/bookings/${lockBooking._id}/verify-start`)
        .set('Authorization', `Bearer ${lockedAgentToken}`)
        .send({ otp: wrongOtp });
      expect(r.status).toBe(400);
    }

    // Now try with correct OTP — should still be blocked due to lockout
    const lockedRes = await request(app)
      .post(`/api/v1/serveease/bookings/${lockBooking._id}/verify-start`)
      .set('Authorization', `Bearer ${lockedAgentToken}`)
      .send({ otp: correctOtp });

    expect(lockedRes.status).toBe(400);
    expect(lockedRes.body.message).toMatch(/locked/i);
  });
});
