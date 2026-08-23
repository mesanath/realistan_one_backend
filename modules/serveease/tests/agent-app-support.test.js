/**
 * Integration tests for the agent-app-support additions (Part A of the ServeEase Agent App plan):
 *   - POST /agents/login (admin-issued username/password)
 *   - PATCH /admin/agents/:id/credentials
 *   - Agent skill-request workflow (POST /agents/skill-requests, GET/PATCH /admin/skill-requests)
 *   - GET /agents/my-jobs populates `review`
 *   - GET /agents/dashboard-stats
 *   - PATCH /agents/profile bankDetails validation (checkFalsy fix — a blank ifsc/accountNo used
 *     to 400-reject the whole request; both the web agent portal and this app's RN Bank Details
 *     tab send blank strings for untouched optional fields)
 *
 * Also asserts the existing OTP agent-login path (unifiedAuth.controller.js) is untouched.
 */

jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

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

const Agent = require('../models/Agent');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');
const AgentSkillRequest = require('../models/AgentSkillRequest');

let app;
let adminToken;

beforeAll(async () => {
  process.env.PORT = '0';
  await connectTestDb();
  await clearTestDb();
  adminToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'admin' }, process.env.JWT_SIG);
  app = require('../../../src/app');
});

afterAll(async () => {
  await closeTestDb();
});

// ─── POST /agents/login ─────────────────────────────────────────────────────

describe('POST /agents/login', () => {
  let agent;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Login Test Agent', phone: '+919833330001', gender: 'male', city: 'Bangalore' });
    await request(app)
      .patch(`/api/v1/serveease/admin/agents/${agent._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'loginagent1', password: 'secret123' });
  });

  it('fails with 401 for an unknown username', async () => {
    const res = await request(app).post('/api/v1/serveease/agents/login').send({ username: 'nope', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('fails with 401 for the wrong password', async () => {
    const res = await request(app).post('/api/v1/serveease/agents/login').send({ username: 'loginagent1', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('succeeds with the admin-issued credentials and returns a usable token', async () => {
    const res = await request(app).post('/api/v1/serveease/agents/login').send({ username: 'loginagent1', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens.access).toBeTruthy();
    expect(res.body.user.role).toBe('agent');

    // The issued token must work against an existing, unmodified authenticate/authorize('agent') route.
    const profileRes = await request(app)
      .get('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${res.body.tokens.access}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data._id).toBe(String(agent._id));
  });

  it('rejects login for a deactivated agent (403)', async () => {
    const inactiveAgent = await Agent.create({ name: 'Inactive Agent', phone: '+919833330002', gender: 'female', city: 'Bangalore', isActive: false });
    await request(app)
      .patch(`/api/v1/serveease/admin/agents/${inactiveAgent._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'inactiveagent', password: 'secret123' });

    const res = await request(app).post('/api/v1/serveease/agents/login').send({ username: 'inactiveagent', password: 'secret123' });
    expect(res.status).toBe(403);
  });

  it('does not break existing OTP-issued agent tokens on any /agents/* route', async () => {
    const otpToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${otpToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /admin/agents/:id/credentials ────────────────────────────────────

describe('PATCH /admin/agents/:id/credentials', () => {
  it('rejects a duplicate username with 409', async () => {
    const a1 = await Agent.create({ name: 'Dup A', phone: '+919833330011', gender: 'male', city: 'Bangalore' });
    const a2 = await Agent.create({ name: 'Dup B', phone: '+919833330012', gender: 'male', city: 'Bangalore' });

    await request(app)
      .patch(`/api/v1/serveease/admin/agents/${a1._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'dupname', password: 'secret123' });

    const res = await request(app)
      .patch(`/api/v1/serveease/admin/agents/${a2._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'dupname', password: 'secret123' });

    expect(res.status).toBe(409);
  });
});

// ─── Skill requests ──────────────────────────────────────────────────────────

describe('Agent skill-request workflow', () => {
  let agent, agentToken, category;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Skill Test Agent', phone: '+919833330021', gender: 'male', city: 'Bangalore' });
    agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    category = await Category.create({ name: 'Plumbing SkillReq', slug: 'plumbing-skillreq' });
  });

  it('agent can submit a skill request', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/agents/skill-requests')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ categoryId: category._id, note: 'I have 3 years experience' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('rejects a duplicate pending request for the same category', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/agents/skill-requests')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ categoryId: category._id });
    expect(res.status).toBe(400);
  });

  it('admin sees the pending request and can approve it', async () => {
    const listRes = await request(app)
      .get('/api/v1/serveease/admin/skill-requests?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    const req = listRes.body.data.find((r) => String(r.agentId._id) === String(agent._id));
    expect(req).toBeTruthy();

    const approveRes = await request(app)
      .patch(`/api/v1/serveease/admin/skill-requests/${req._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(approveRes.status).toBe(200);
  });

  it('approval adds the category to Agent.skills, reflected on GET /agents/profile', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    const skillIds = res.body.data.skills.map((s) => String(s._id));
    expect(skillIds).toContain(String(category._id));
  });

  it('GET /agents/skill-requests returns the agent’s own requests, populated', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/agents/skill-requests')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].categoryId.name).toBe('Plumbing SkillReq');
    expect(res.body.data[0].status).toBe('approved');
  });

  it('400s a request for a category already in the agent’s skills', async () => {
    const res = await request(app)
      .post('/api/v1/serveease/agents/skill-requests')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ categoryId: category._id });
    expect(res.status).toBe(400);
  });
});

// ─── my-jobs review populate + dashboard-stats ─────────────────────────────

describe('GET /agents/my-jobs review populate + GET /agents/dashboard-stats', () => {
  let agent, agentToken, customer, booking;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Stats Test Agent', phone: '+919833330031', gender: 'male', city: 'Bangalore' });
    agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    customer = await User.create({ name: 'Stats Test Customer', phone: '+919833330032' });

    booking = await Booking.create({
      agentId: agent._id,
      customerId: customer._id,
      serviceId: new mongoose.Types.ObjectId(),
      address: { addressLine: '1 Test Rd', city: 'Bangalore', pincode: '560001' },
      scheduledAt: new Date(),
      baseAmount: 400,
      finalAmount: 400,
      status: 'completed',
      serviceEndedAt: new Date(),
    });

    const review = await Review.create({
      bookingId: booking._id, customerId: customer._id, agentId: agent._id,
      serviceId: booking.serviceId, rating: 5, comment: 'Great job', tags: ['punctual'],
    });
    booking.review = review._id;
    await booking.save();

    // one pending job too, for dashboard-stats
    await Booking.create({
      agentId: agent._id, customerId: customer._id, serviceId: new mongoose.Types.ObjectId(),
      address: { addressLine: '2 Test Rd', city: 'Bangalore', pincode: '560001' },
      scheduledAt: new Date(), baseAmount: 200, finalAmount: 200, status: 'assigned',
    });
  });

  it('populates review on completed jobs', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/agents/my-jobs?status=completed')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    const job = res.body.data.find((b) => String(b._id) === String(booking._id));
    expect(job.review).toBeTruthy();
    expect(job.review.rating).toBe(5);
    expect(job.review.comment).toBe('Great job');
  });

  it('dashboard-stats returns completed/pending counts', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/agents/dashboard-stats')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.completedCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingCount).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.todayEarnings).toBe('number');
  });
});

// ─── PATCH /agents/profile bankDetails (checkFalsy regression) ────────────────

describe('PATCH /agents/profile bankDetails validation', () => {
  let agent, agentToken;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Bank Details Agent', phone: '+919833330041', gender: 'male', city: 'Bangalore' });
    agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
  });

  it('accepts blank accountNo/ifsc/upi — a form field left untouched sends "", not undefined', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ bankDetails: { accountNo: '', ifsc: '', bankName: 'HDFC Bank', upi: '' } });
    expect(res.status).toBe(200);
    expect(res.body.data.bankDetails.bankName).toBe('HDFC Bank');
  });

  it('saves a real accountNo/ifsc (the field the app actually sends, not the old accountNumber)', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ bankDetails: { accountNo: '123456789012', ifsc: 'HDFC0001234', bankName: 'HDFC Bank', upi: 'agent@upi' } });
    expect(res.status).toBe(200);
    expect(res.body.data.bankDetails.accountNo).toBe('123456789012');
    expect(res.body.data.bankDetails.ifsc).toBe('HDFC0001234');
  });

  it('still rejects a genuinely malformed (non-blank) ifsc', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ bankDetails: { ifsc: 'not-a-valid-ifsc' } });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /agents/profile no longer self-grants skills (closes the skill-request bypass) ─────

describe('PATCH /agents/profile skills field is ignored', () => {
  let agent, agentToken, category;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Skill Bypass Agent', phone: '+919833330042', gender: 'male', city: 'Bangalore' });
    agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    category = await Category.create({ name: 'Bypass Category', slug: 'bypass-category' });
  });

  it('does not add a skill sent directly in the request body — must go through skill-requests', async () => {
    const res = await request(app)
      .patch('/api/v1/serveease/agents/profile')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ bio: 'trying to self-grant a skill', skills: [category._id.toString()] });
    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe('trying to self-grant a skill');
    expect(res.body.data.skills).toEqual([]);

    const reloaded = await Agent.findById(agent._id);
    expect(reloaded.skills).toEqual([]);
  });
});
