/**
 * Integration tests for:
 *   - Agent login attempts logged to AuditLog (agent_login_failed / agent_login_success) —
 *     surfaced on the admin agent-detail page's "Recent Login Activity".
 *   - GET/PATCH /agents/notifications — the agent app's in-app notification center.
 *   - Admin actions (skill-request review, credential reset, dispute reply/resolve) creating
 *     an in-app Notification for the affected agent.
 */

jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');

const Agent = require('../models/Agent');
const Category = require('../models/Category');
const AgentSkillRequest = require('../models/AgentSkillRequest');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const User = require('../models/User');

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

// ─── Login attempt audit trail ──────────────────────────────────────────────

describe('POST /agents/login writes AuditLog entries', () => {
  let agent;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Audit Test Agent', phone: '+919833330051', gender: 'male', city: 'Bangalore' });
    await request(app)
      .patch(`/api/v1/serveease/admin/agents/${agent._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'audittestagent', password: 'secret123' });
  });

  it('logs agent_login_failed for a wrong password, tied to the agent', async () => {
    await request(app).post('/api/v1/serveease/agents/login').send({ username: 'audittestagent', password: 'wrong' });
    const log = await AuditLog.findOne({ type: 'agent_login_failed', userId: agent._id, 'meta.reason': 'wrong_password' });
    expect(log).toBeTruthy();
  });

  it('logs agent_login_failed for an unknown username, with no userId', async () => {
    await request(app).post('/api/v1/serveease/agents/login').send({ username: 'nosuchagent', password: 'whatever' });
    const log = await AuditLog.findOne({ type: 'agent_login_failed', 'meta.reason': 'unknown_username', 'meta.username': 'nosuchagent' });
    expect(log).toBeTruthy();
    expect(log.userId).toBeNull();
  });

  it('logs agent_login_success on a correct login', async () => {
    await request(app).post('/api/v1/serveease/agents/login').send({ username: 'audittestagent', password: 'secret123' });
    const log = await AuditLog.findOne({ type: 'agent_login_success', userId: agent._id });
    expect(log).toBeTruthy();
  });

  it('admin can filter the general audit log by agent + type (existing GET /admin/audit, no new endpoint needed)', async () => {
    const res = await request(app)
      .get(`/api/v1/serveease/admin/audit?type=agent_login_failed&userId=${agent._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((l) => l.meta?.reason === 'wrong_password')).toBe(true);
  });
});

// ─── Notifications ───────────────────────────────────────────────────────────

describe('GET/PATCH /agents/notifications', () => {
  let agent, agentToken;

  beforeAll(async () => {
    agent = await Agent.create({ name: 'Notif Test Agent', phone: '+919833330052', gender: 'male', city: 'Bangalore' });
    agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    await Notification.create([
      { userId: agent._id, userRole: 'agent', type: 'general', channel: 'in_app', body: 'First' },
      { userId: agent._id, userRole: 'agent', type: 'general', channel: 'in_app', body: 'Second' },
      // A different agent's notification must never leak into the first agent's list.
      { userId: new mongoose.Types.ObjectId(), userRole: 'agent', type: 'general', channel: 'in_app', body: 'Not mine' },
    ]);
  });

  it('lists only this agent’s notifications with an unread count', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/agents/notifications')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.every((n) => n.body !== 'Not mine')).toBe(true);
    expect(res.body.unreadCount).toBe(2);
  });

  it('marks a single notification read', async () => {
    const list = await request(app).get('/api/v1/serveease/agents/notifications').set('Authorization', `Bearer ${agentToken}`);
    const id = list.body.data[0]._id;

    const res = await request(app)
      .patch(`/api/v1/serveease/agents/notifications/${id}/read`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.readAt).toBeTruthy();
  });

  it('mark-all-read clears the unread count', async () => {
    await request(app).patch('/api/v1/serveease/agents/notifications/read-all').set('Authorization', `Bearer ${agentToken}`);
    const res = await request(app).get('/api/v1/serveease/agents/notifications').set('Authorization', `Bearer ${agentToken}`);
    expect(res.body.unreadCount).toBe(0);
  });
});

// ─── Admin actions -> agent notification ────────────────────────────────────

describe('Admin actions create an in-app Notification for the affected agent', () => {
  it('setAgentCredentials notifies the agent', async () => {
    const agent = await Agent.create({ name: 'Cred Notif Agent', phone: '+919833330053', gender: 'male', city: 'Bangalore' });
    await request(app)
      .patch(`/api/v1/serveease/admin/agents/${agent._id}/credentials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'crednotifagent', password: 'secret123' });

    const notif = await Notification.findOne({ userId: agent._id, type: 'credentials_updated' });
    expect(notif).toBeTruthy();
  });

  it('reviewSkillRequest (approve) notifies the agent with the category name', async () => {
    const agent = await Agent.create({ name: 'Skill Notif Agent', phone: '+919833330054', gender: 'male', city: 'Bangalore' });
    const category = await Category.create({ name: 'Notif Test Category', slug: 'notif-test-category' });
    const skillReq = await AgentSkillRequest.create({ agentId: agent._id, categoryId: category._id });

    await request(app)
      .patch(`/api/v1/serveease/admin/skill-requests/${skillReq._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    const notif = await Notification.findOne({ userId: agent._id, type: 'skill_request_approved' });
    expect(notif).toBeTruthy();
    expect(notif.body).toContain('Notif Test Category');
  });

  it('dispute reply/resolve notifies the agent who raised it, not just the customer', async () => {
    const agent = await Agent.create({ name: 'Dispute Notif Agent', phone: '+919833330055', gender: 'male', city: 'Bangalore' });
    const agentToken = jwt.sign({ id: agent._id.toString(), role: 'agent' }, process.env.JWT_SECRET);
    const customer = await User.create({ name: 'Dispute Notif Customer', phone: '+919833330056' });

    const booking = await Booking.create({
      agentId: agent._id, customerId: customer._id, serviceId: new mongoose.Types.ObjectId(),
      address: { addressLine: '1 Test Rd', city: 'Bangalore', pincode: '560001' },
      scheduledAt: new Date(), baseAmount: 300, finalAmount: 300, status: 'completed',
    });

    const disputeRes = await request(app)
      .post('/api/v1/serveease/disputes')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ bookingId: booking._id, reason: 'customer_abusive', description: 'Test dispute from agent' });
    expect(disputeRes.status).toBe(201);
    const disputeId = disputeRes.body.data._id;

    await request(app)
      .patch(`/api/v1/serveease/disputes/${disputeId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminReply: 'We are looking into it' });

    const replyNotif = await Notification.findOne({ userId: agent._id, type: 'dispute_reply' });
    expect(replyNotif).toBeTruthy();

    await request(app)
      .patch(`/api/v1/serveease/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'no_refund', adminNote: 'Resolved, no refund warranted' });

    const resolvedNotif = await Notification.findOne({ userId: agent._id, type: 'dispute_resolved' });
    expect(resolvedNotif).toBeTruthy();

    // And the existing "own disputes" listing an agent already had access to shows it.
    const mine = await request(app).get('/api/v1/serveease/disputes').set('Authorization', `Bearer ${agentToken}`);
    expect(mine.body.data.some((d) => d._id === disputeId)).toBe(true);
  });
});
