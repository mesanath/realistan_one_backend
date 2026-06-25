const User = require('../models/User');
const Agent = require('../models/Agent');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const AgentChangeRequest = require('../models/AgentChangeRequest');
const Coupon = require('../models/Coupon');
const Zone = require('../models/Zone');
const Payment = require('../models/Payment');

// GET /api/v1/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      totalBookingsToday, activeBookings, completedToday,
      cancelledToday, onlineAgents, totalCustomers,
      totalAgents, revenueToday, liveBookings, pendingAgents,
      otpAudit,
    ] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ status: { $in: ['assigned', 'en_route', 'arrived', 'in_progress'] } }),
      Booking.countDocuments({ status: 'completed', serviceEndedAt: { $gte: today } }),
      Booking.countDocuments({ status: 'cancelled', createdAt: { $gte: today } }),
      Agent.countDocuments({ status: 'online', isApproved: true }),
      User.countDocuments({ isActive: true, isAdmin: { $ne: true } }),
      Agent.countDocuments({ isApproved: true }),
      Booking.aggregate([
        { $match: { status: 'completed', serviceEndedAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Booking.find({ status: { $in: ['assigned', 'en_route', 'arrived', 'in_progress'] } })
        .populate('customerId', 'name phone')
        .populate('agentId', 'name phone')
        .populate('serviceId', 'name')
        .sort({ updatedAt: -1 }).limit(10),
      Agent.find({ isApproved: false, isActive: true }).sort({ createdAt: -1 }).limit(5),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: today }, type: { $in: ['otp_issued', 'otp_verified', 'otp_failed', 'otp_expired'] } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const otpStats = { issued: 0, verified: 0, failures: 0, expired: 0 };
    otpAudit.forEach(({ _id, count }) => {
      if (_id === 'otp_issued') otpStats.issued = count;
      else if (_id === 'otp_verified') otpStats.verified = count;
      else if (_id === 'otp_failed') otpStats.failures = count;
      else if (_id === 'otp_expired') otpStats.expired = count;
    });

    // City performance
    const cityStats = await Booking.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: '$address.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    res.json({
      success: true,
      data: {
        bookingsToday: totalBookingsToday,
        activeBookings,
        completedToday,
        cancelledToday,
        onlineAgents,
        totalCustomers,
        totalAgents,
        revenueToday: revenueToday[0]?.total || 0,
        liveBookings,
        pendingAgents,
        otpStats,
        cityStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { status, city, page = 1, limit = 20, from, to, search: _search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('customerId', 'name phone email')
        .populate('agentId', 'name phone')
        .populate('serviceId', 'name basePrice')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, data: bookings, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const allowed = ['status', 'agentId', 'scheduledAt', 'notes'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const booking = await Booking.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .populate('customerId', 'name phone')
      .populate('agentId', 'name phone')
      .populate('serviceId', 'name');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await AuditLog.create({
      type: 'admin_action',
      userId: req.user.id,
      role: 'admin',
      meta: { action: 'update_booking', bookingId: req.params.id, changes: updates },
    });
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/customers
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, city: _city } = req.query;
    const filter = { isAdmin: { $ne: true } };
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      User.find(filter).select('-__v -wallet.transactions').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: customers, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-__v');
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const [bookings, reviews] = await Promise.all([
      Booking.find({ customerId: req.params.id })
        .populate('serviceId', 'name basePrice')
        .populate('agentId', 'name phone')
        .sort({ createdAt: -1 }).limit(20),
      Review.find({ customerId: req.params.id })
        .populate('serviceId', 'name')
        .populate('agentId', 'name')
        .sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ success: true, data: { customer, bookings, reviews } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/customers/:id/toggle-active
exports.toggleCustomerActive = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    customer.isActive = !customer.isActive;
    await customer.save();
    await AuditLog.create({
      type: 'admin_action', userId: req.user.id, role: 'admin',
      meta: { action: customer.isActive ? 'activate_customer' : 'block_customer', customerId: req.params.id },
    });
    res.json({ success: true, isActive: customer.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/agents — with live status
exports.getAgents = async (req, res) => {
  try {
    const { status, city, approved, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (city) filter.city = new RegExp(city, 'i');
    if (approved !== undefined) filter.isApproved = approved === 'true';
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [agents, total] = await Promise.all([
      Agent.find(filter).populate('skills', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Agent.countDocuments(filter),
    ]);
    res.json({ success: true, data: agents, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/agents/:id
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate('skills', 'name slug icon');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const [bookings, reviews, issues] = await Promise.all([
      Booking.find({ agentId: req.params.id })
        .populate('customerId', 'name phone')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 }).limit(20),
      Review.find({ agentId: req.params.id })
        .populate('customerId', 'name')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 }).limit(10),
      Booking.find({ agentId: req.params.id, status: 'cancelled' })
        .populate('customerId', 'name phone')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ success: true, data: { agent, bookings, reviews, issues } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/agents
exports.createAgent = async (req, res) => {
  try {
    const agent = await Agent.create(req.body);
    await AuditLog.create({
      type: 'admin_action', userId: req.user.id, role: 'admin',
      meta: { action: 'create_agent', agentId: agent._id },
    });
    res.status(201).json({ success: true, data: agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/agents/:id
exports.updateAgent = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'city', 'bio', 'skills', 'isApproved', 'isActive', 'bankDetails', 'zoneId'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const agent = await Agent.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .populate('skills', 'name slug');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    await AuditLog.create({
      type: 'admin_action', userId: req.user.id, role: 'admin',
      meta: { action: 'update_agent', agentId: req.params.id, changes: updates },
    });
    res.json({ success: true, data: agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/agents/:id/approve
exports.approveAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    await AuditLog.create({ type: 'admin_action', userId: req.user.id, role: 'admin', meta: { action: 'approve_agent', agentId: req.params.id } });
    res.json({ success: true, message: 'Agent approved', data: agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/agents/:id/toggle-active
exports.toggleAgentActive = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    agent.isActive = !agent.isActive;
    await agent.save();
    await AuditLog.create({
      type: 'admin_action', userId: req.user.id, role: 'admin',
      meta: { action: agent.isActive ? 'activate_agent' : 'deactivate_agent', agentId: req.params.id },
    });
    res.json({ success: true, isActive: agent.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/agents/:id/background-verify
exports.toggleBackgroundVerify = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    agent.backgroundVerified = !agent.backgroundVerified;
    await agent.save();
    await AuditLog.create({
      type: 'admin_action', userId: req.user.id, role: 'admin',
      meta: {
        action: agent.backgroundVerified ? 'background_verify_agent' : 'background_verify_revoke_agent',
        agentId: req.params.id,
      },
    });
    res.json({ success: true, backgroundVerified: agent.backgroundVerified });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/audit — Audit logs with filters + optional CSV export
exports.getAuditLogs = async (req, res) => {
  try {
    const { type, bookingId, role, userId, from, to, page = 1, limit = 50, format } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (bookingId) filter.bookingId = bookingId;
    if (role) filter.role = role;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (format === 'csv') {
      // Stream all matching logs (cap at 10 000 for safety)
      const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
      const header = 'id,type,role,bookingId,userId,ip,createdAt\n';
      const rows = logs.map((l) =>
        [l._id, l.type, l.role, l.bookingId || '', l.userId || '', l.ip || '', l.createdAt.toISOString()].join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return res.send(header + rows);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/agents/locations — lightweight snapshot for map dashboard
exports.getAgentLocations = async (req, res) => {
  try {
    const agents = await Agent.find(
      { isActive: true, 'currentLocation.lat': { $ne: null } },
      { _id: 1, name: 1, status: 1, city: 1, currentLocation: 1, profilePicture: 1 }
    ).lean();
    res.json({ success: true, data: agents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/bookings/heatmap — booking density points for the last N days
exports.getBookingHeatmap = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    if (period === 'today') from.setHours(0, 0, 0, 0);

    // Aggregate bookings that have address lat/lng
    const raw = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: from },
          'address.lat': { $ne: null, $exists: true },
          'address.lng': { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: {
            // round to ~500m grid so nearby bookings cluster
            lat: { $round: [{ $multiply: ['$address.lat', 200] }, 0] },
            lng: { $round: [{ $multiply: ['$address.lng', 200] }, 0] },
          },
          weight: { $sum: 1 },
          lat: { $first: '$address.lat' },
          lng: { $first: '$address.lng' },
        },
      },
      { $project: { _id: 0, lat: 1, lng: 1, weight: 1 } },
    ]);

    // If no real data exists yet, return a realistic demo dataset for Bangalore
    const points = raw.length > 0 ? raw : BANGALORE_DEMO_POINTS;

    res.json({ success: true, data: { points, period } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Demo heatmap data — Bangalore neighbourhoods (used when no booking lat/lng exists)
const BANGALORE_DEMO_POINTS = [
  // Koramangala cluster
  { lat: 12.9352, lng: 77.6245, weight: 18 },
  { lat: 12.9340, lng: 77.6230, weight: 14 },
  { lat: 12.9368, lng: 77.6260, weight: 11 },
  { lat: 12.9325, lng: 77.6255, weight: 9 },
  // Indiranagar cluster
  { lat: 12.9784, lng: 77.6408, weight: 16 },
  { lat: 12.9760, lng: 77.6420, weight: 12 },
  { lat: 12.9800, lng: 77.6390, weight: 8 },
  // HSR Layout cluster
  { lat: 12.9116, lng: 77.6389, weight: 14 },
  { lat: 12.9130, lng: 77.6370, weight: 10 },
  { lat: 12.9100, lng: 77.6400, weight: 7 },
  // Whitefield cluster
  { lat: 12.9698, lng: 77.7500, weight: 13 },
  { lat: 12.9720, lng: 77.7480, weight: 9 },
  { lat: 12.9680, lng: 77.7520, weight: 6 },
  // Jayanagar cluster
  { lat: 12.9308, lng: 77.5838, weight: 15 },
  { lat: 12.9290, lng: 77.5820, weight: 11 },
  { lat: 12.9325, lng: 77.5850, weight: 8 },
  // Marathahalli cluster
  { lat: 12.9591, lng: 77.6971, weight: 12 },
  { lat: 12.9570, lng: 77.6990, weight: 8 },
  // Electronic City cluster
  { lat: 12.8399, lng: 77.6770, weight: 10 },
  { lat: 12.8380, lng: 77.6790, weight: 7 },
  // Bannerghatta Road cluster
  { lat: 12.9010, lng: 77.5950, weight: 9 },
  { lat: 12.8990, lng: 77.5970, weight: 6 },
  // MG Road / CBD
  { lat: 12.9756, lng: 77.6050, weight: 11 },
  { lat: 12.9770, lng: 77.6030, weight: 8 },
];

// GET /api/v1/admin/analytics/revenue
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const from = new Date(); from.setDate(from.getDate() - days);

    const data = await Booking.aggregate([
      { $match: { status: 'completed', serviceEndedAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$serviceEndedAt' } }, revenue: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Agent Assignment ─────────────────────────────────────────────────────────

// PATCH /api/v1/admin/bookings/:id/assign-agent
exports.assignAgentToBooking = async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ success: false, message: 'agentId is required' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['completed', 'cancelled', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot assign agent to a ${booking.status} booking` });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    if (!agent.isApproved || !agent.isActive) {
      return res.status(400).json({ success: false, message: 'Agent is not approved or active' });
    }

    // Release previous agent back to online
    if (booking.agentId && booking.agentId.toString() !== agentId.toString()) {
      await Agent.findByIdAndUpdate(booking.agentId, { status: 'online' });
    }

    await Booking.findByIdAndUpdate(req.params.id, { agentId, status: 'assigned' });
    await Agent.findByIdAndUpdate(agentId, { status: 'busy' });

    await AuditLog.create({
      type: 'booking_assigned', bookingId: req.params.id, userId: req.user.id, role: 'admin',
      meta: { action: 'admin_assign_agent', agentId, previousAgentId: booking.agentId || null },
    });

    const updated = await Booking.findById(req.params.id)
      .populate('agentId', 'name phone rating city skills')
      .populate('customerId', 'name phone')
      .populate('serviceId', 'name');

    res.json({ success: true, message: 'Agent assigned successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Agent Change Requests ────────────────────────────────────────────────────

// GET /api/v1/admin/agent-change-requests
exports.getAgentChangeRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      AgentChangeRequest.find(filter)
        .populate({ path: 'bookingId', select: 'bookingCode scheduledAt status', populate: { path: 'serviceId', select: 'name' } })
        .populate('customerId', 'name phone')
        .populate('fromAgentId', 'name phone city rating')
        .populate('newAgentId', 'name phone city')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AgentChangeRequest.countDocuments(filter),
    ]);

    res.json({ success: true, data: requests, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/agent-change-requests/:id
exports.reviewAgentChangeRequest = async (req, res) => {
  try {
    const { action, agentId } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const request = await AgentChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    if (action === 'approve') {
      if (!agentId) return res.status(400).json({ success: false, message: 'agentId is required to approve' });

      const agent = await Agent.findById(agentId);
      if (!agent || !agent.isApproved || !agent.isActive) {
        return res.status(400).json({ success: false, message: 'Agent is not available' });
      }

      const booking = await Booking.findById(request.bookingId);
      if (booking?.agentId) {
        await Agent.findByIdAndUpdate(booking.agentId, { status: 'online' });
      }

      await Booking.findByIdAndUpdate(request.bookingId, { agentId, status: 'assigned' });
      await Agent.findByIdAndUpdate(agentId, { status: 'busy' });
      await request.updateOne({ status: 'approved', newAgentId: agentId, reviewedBy: req.user.id, reviewedAt: new Date() });

      await AuditLog.create({
        type: 'booking_assigned', bookingId: request.bookingId, userId: req.user.id, role: 'admin',
        meta: { action: 'approve_agent_change', agentId, requestId: request._id },
      });
    } else {
      await request.updateOne({ status: 'rejected', reviewedBy: req.user.id, reviewedAt: new Date() });
      await AuditLog.create({
        type: 'admin_action', bookingId: request.bookingId, userId: req.user.id, role: 'admin',
        meta: { action: 'reject_agent_change', requestId: request._id },
      });
    }

    res.json({ success: true, message: `Request ${action}d` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Booking Stats (analytics) ────────────────────────────────────────────────

// GET /api/v1/admin/analytics/bookings
exports.getBookingStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const from = new Date(); from.setDate(from.getDate() - days);

    const [statusBreakdown, topServices, totals] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: '$serviceId', count: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$service.name', 'Unknown'] }, count: 1, revenue: 1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$finalAmount' }, avgOrder: { $avg: '$finalAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown,
        topServices,
        totals: totals[0] || { total: 0, revenue: 0, avgOrder: 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Coupons (Promotions) ─────────────────────────────────────────────────────

// GET /api/v1/admin/coupons
exports.getAdminCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', active } = req.query;
    const filter = {};
    if (search) filter.code = { $regex: search.toUpperCase(), $options: 'i' };
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('applicableCategories', 'name'),
      Coupon.countDocuments(filter),
    ]);
    res.json({ success: true, data: coupons, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/coupons
exports.createAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    await AuditLog.create({ type: 'admin_action', userId: req.user.id, role: 'admin', meta: { action: 'create_coupon', code: coupon.code } });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/coupons/:id
exports.updateAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/coupons/:id/toggle
exports.toggleAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Zones ────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/zones
exports.getAdminZones = async (req, res) => {
  try {
    const { city, active } = req.query;
    const filter = {};
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const zones = await Zone.find(filter).sort({ city: 1, name: 1 });
    res.json({ success: true, data: zones, total: zones.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/zones
exports.createAdminZone = async (req, res) => {
  try {
    const zone = await Zone.create(req.body);
    await AuditLog.create({ type: 'admin_action', userId: req.user.id, role: 'admin', meta: { action: 'create_zone', zoneId: zone._id } });
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/zones/:id
exports.updateAdminZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/admin/zones/:id/toggle
exports.toggleAdminZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
    zone.isActive = !zone.isActive;
    await zone.save();
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/payments
exports.getAdminPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, gateway } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('customerId', 'name phone')
        .populate({ path: 'bookingId', select: 'bookingCode finalAmount' }),
      Payment.countDocuments(filter),
    ]);
    res.json({ success: true, data: payments, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
