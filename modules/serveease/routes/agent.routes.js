const router = require('express').Router();
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { agentActionLimit } = require('../../../src/middleware/rateLimit.middleware');
const { updateAgentProfileRules, applyLeaveRules } = require('../validators/validators');

// ─── Public: available agents for customer to browse ─────────────────────────
// GET /api/v1/agents/available?city=&serviceId=&date=
router.get('/available', async (req, res) => {
  try {
    const { city, serviceId, date } = req.query;
    if (!city) return res.status(400).json({ success: false, message: 'city is required' });

    const filter = { city, isApproved: true, isActive: true };

    // Exclude agents who have a leave on the requested date
    if (date) {
      const requestedDate = new Date(date);
      const dayStart = new Date(requestedDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(requestedDate); dayEnd.setHours(23, 59, 59, 999);
      filter['leaves'] = {
        $not: { $elemMatch: { date: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['pending', 'approved'] } } },
      };
    }

    // If serviceId provided, filter by agents who have the matching category skill
    let skillFilter = null;
    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      const Service = require('../models/Service');
      const service = await Service.findById(serviceId, 'categoryId');
      if (service) skillFilter = service.categoryId;
    }
    if (skillFilter) filter.skills = skillFilter;

    const agents = await Agent.find(filter, 'name profileImage rating ratingCount totalJobs status city skills bio')
      .populate('skills', 'name icon')
      .sort({ rating: -1, totalJobs: -1 })
      .limit(20);

    res.json({ success: true, data: agents, total: agents.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── All routes below require authentication ──────────────────────────────────
router.use(authenticate);

// GET /api/v1/agents/jobs — available jobs in agent's city
router.get('/jobs', authorize('agent'), async (req, res) => {
  try {
    const agent = await Agent.findById(req.user.id);
    const jobs = await Booking.find({ 'address.city': agent.city, status: 'confirmed' })
      .populate('serviceId', 'name basePrice durationMinutes')
      .sort({ scheduledAt: 1 })
      .limit(20);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/agents/my-jobs — agent's assigned bookings
router.get('/my-jobs', authorize('agent'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { agentId: req.user.id };
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate('serviceId', 'name images')
      .populate('customerId', 'name phone')
      .sort({ scheduledAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/agents/profile — own profile
router.get('/profile', authorize('agent'), async (req, res) => {
  try {
    const agent = await Agent.findById(req.user.id).populate('skills', 'name slug icon');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/agents/profile — update name, bio, skills, bank details
router.patch('/profile', authorize('agent'), updateAgentProfileRules, async (req, res) => {
  try {
    const { name, bio, skills, bankDetails } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (skills) updates.skills = skills;
    if (bankDetails) updates.bankDetails = bankDetails;

    const agent = await Agent.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .populate('skills', 'name slug icon');
    res.json({ success: true, data: agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/agents/location — update GPS
router.patch('/location', authorize('agent'), agentActionLimit, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Agent.findByIdAndUpdate(req.user.id, {
      'currentLocation.lat': lat, 'currentLocation.lng': lng, 'currentLocation.updatedAt': new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/agents/status
router.patch('/status', authorize('agent'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    await Agent.findByIdAndUpdate(req.user.id, { status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Earnings helpers ─────────────────────────────────────────────────────────

function parsePeriod(period, from, to) {
  const now = new Date();
  if (period === 'custom' && from && to) {
    return { fromDate: new Date(from), toDate: new Date(to) };
  }
  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - days);
  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate: now };
}

async function buildEarningsData(agentId, period, from, to) {
  const { fromDate, toDate } = parsePeriod(period, from, to);
  const COMMISSION = 0.75;

  const bookings = await Booking.find({
    agentId: mongoose.Types.ObjectId.createFromHexString(agentId),
    status: 'completed',
    serviceEndedAt: { $gte: fromDate, $lte: toDate },
  })
    .populate('serviceId', 'name')
    .populate('customerId', 'name')
    .sort({ serviceEndedAt: 1 });

  const totalEarnings = bookings.reduce((s, b) => s + (b.finalAmount || 0) * COMMISSION, 0);
  const totalJobs = bookings.length;
  const avgPerJob = totalJobs > 0 ? totalEarnings / totalJobs : 0;

  // Build daily breakdown map
  const dailyMap = {};
  bookings.forEach((b) => {
    const dateStr = new Date(b.serviceEndedAt).toISOString().slice(0, 10);
    if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, jobs: 0, earnings: 0 };
    dailyMap[dateStr].jobs += 1;
    dailyMap[dateStr].earnings += (b.finalAmount || 0) * COMMISSION;
  });

  // Fill every day in the range (so chart has no gaps)
  const dailyBreakdown = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    dailyBreakdown.push(dailyMap[dateStr] || { date: dateStr, jobs: 0, earnings: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const bookingSummaries = bookings.map((b) => ({
    _id: b._id,
    bookingCode: b.bookingCode,
    serviceName: b.serviceId?.name || 'Service',
    customerName: b.customerId?.name || 'Customer',
    completedAt: b.serviceEndedAt,
    amount: b.finalAmount || 0,
    agentEarning: Math.round((b.finalAmount || 0) * COMMISSION),
  }));

  return { totalEarnings: Math.round(totalEarnings), totalJobs, avgPerJob: Math.round(avgPerJob), dailyBreakdown, bookings: bookingSummaries, fromDate, toDate };
}

// GET /api/v1/agents/earnings
router.get('/earnings', authorize('agent'), async (req, res) => {
  try {
    const { period = '30d', from, to } = req.query;
    const data = await buildEarningsData(req.user.id, period, from, to);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/agents/earnings/export
router.get('/earnings/export', authorize('agent'), async (req, res) => {
  try {
    const { format = 'csv', period = '30d', from, to } = req.query;
    const agent = await Agent.findById(req.user.id, 'name phone email');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const data = await buildEarningsData(req.user.id, period, from, to);
    const periodLabel = `${data.fromDate.toISOString().slice(0, 10)}_${data.toDate.toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const rows = [
        ['Date', 'Booking Code', 'Service', 'Customer', 'Invoice Amount (INR)', 'Your Earning (INR)'],
        ...data.bookings.map((b) => [
          b.completedAt ? new Date(b.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          b.bookingCode || '',
          b.serviceName,
          b.customerName,
          b.amount.toFixed(2),
          b.agentEarning.toFixed(2),
        ]),
        [],
        ['', '', '', 'Total Jobs', data.totalJobs, ''],
        ['', '', '', 'Total Earnings (INR)', '', data.totalEarnings.toFixed(2)],
        ['', '', '', 'Avg per Job (INR)', '', data.avgPerJob.toFixed(2)],
      ];
      const csvContent = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="serveease-earnings-${periodLabel}.csv"`);
      return res.send('﻿' + csvContent); // BOM for Excel UTF-8 compatibility
    }

    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="serveease-earnings-${periodLabel}.pdf"`);
        res.send(buffer);
      });

      const primary = '#16a34a';
      const textDark = '#1e293b';
      const textMuted = '#64748b';
      const lineColor = '#e2e8f0';

      // Header band
      doc.rect(0, 0, 595, 75).fill(primary);
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('ServeEase', 50, 22);
      doc.fontSize(9).font('Helvetica').text('Realistan · Earnings Statement', 50, 48);
      doc.fontSize(9).text('EARNINGS REPORT', 450, 30, { align: 'right', width: 100 });

      // Agent + period info
      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text('Agent', 50, 95);
      doc.font('Helvetica').fontSize(9).fillColor(textMuted);
      doc.fillColor(textDark).text(agent.name, 50, 112);
      doc.fillColor(textMuted).text(agent.phone || '', 50, 127);

      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text('Period', 350, 95);
      doc.font('Helvetica').fontSize(9).fillColor(textMuted);
      doc.fillColor(textDark).text(`${data.fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${data.toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 350, 112);
      doc.fillColor(textMuted).text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 350, 127);

      // Summary row
      doc.moveTo(50, 155).lineTo(545, 155).strokeColor(lineColor).stroke();

      const summaryItems = [
        ['Total Jobs', data.totalJobs],
        ['Total Earnings', `₹${data.totalEarnings.toLocaleString('en-IN')}`],
        ['Avg per Job', `₹${data.avgPerJob.toLocaleString('en-IN')}`],
      ];
      summaryItems.forEach(([label, value], i) => {
        const x = 50 + i * 165;
        doc.rect(x, 165, 155, 50).fill('#f0fdf4').stroke('#bbf7d0');
        doc.fillColor(primary).font('Helvetica-Bold').fontSize(14).text(String(value), x + 10, 172, { width: 135, align: 'center' });
        doc.fillColor(textMuted).font('Helvetica').fontSize(8).text(label, x + 10, 192, { width: 135, align: 'center' });
      });

      // Table header
      let y = 235;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).stroke();
      y += 10;
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(8);
      doc.text('Date', 50, y);
      doc.text('Booking', 130, y);
      doc.text('Service', 210, y);
      doc.text('Customer', 340, y);
      doc.text('Amount', 435, y, { width: 55, align: 'right' });
      doc.text('Earned', 493, y, { width: 52, align: 'right' });
      y += 14;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).stroke();
      y += 8;

      doc.font('Helvetica').fontSize(8);
      data.bookings.forEach((b, idx) => {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        if (idx % 2 === 0) doc.rect(50, y - 3, 495, 16).fill('#f8fafc').stroke('#f1f5f9');
        doc.fillColor(textDark);
        const dateStr = b.completedAt ? new Date(b.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
        doc.text(dateStr, 50, y, { width: 75 });
        doc.text(b.bookingCode || '—', 130, y, { width: 75 });
        doc.text(b.serviceName, 210, y, { width: 125 });
        doc.text(b.customerName, 340, y, { width: 90 });
        doc.text(`₹${b.amount.toLocaleString('en-IN')}`, 435, y, { width: 55, align: 'right' });
        doc.fillColor(primary).text(`₹${b.agentEarning.toLocaleString('en-IN')}`, 493, y, { width: 52, align: 'right' });
        y += 18;
      });

      if (data.bookings.length === 0) {
        doc.fillColor(textMuted).fontSize(9).text('No completed bookings in this period.', 50, y, { align: 'center', width: 495 });
        y += 20;
      }

      // Footer
      doc.moveTo(50, 750).lineTo(545, 750).strokeColor(lineColor).stroke();
      doc.fillColor(textMuted).fontSize(7).font('Helvetica')
        .text('Realistan ServeEase · For queries: support@realistan.in · +91 80000 00000', 50, 758, { align: 'center', width: 495 });

      doc.end();
      return; // response sent in 'end' handler
    }

    return res.status(400).json({ success: false, message: 'format must be csv or pdf' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Leave Management ─────────────────────────────────────────────────────────

// GET /api/v1/agents/leave — list all leaves
router.get('/leave', authorize('agent'), async (req, res) => {
  try {
    const agent = await Agent.findById(req.user.id, 'leaves');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, data: agent.leaves.sort((a, b) => new Date(a.date) - new Date(b.date)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/agents/leave — apply for a day off
router.post('/leave', authorize('agent'), agentActionLimit, applyLeaveRules, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const leaveDate = new Date(date);
    if (isNaN(leaveDate)) return res.status(400).json({ success: false, message: 'Invalid date format' });

    // Cannot apply leave for past dates
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (leaveDate < today) return res.status(400).json({ success: false, message: 'Cannot apply leave for past dates' });

    const agent = await Agent.findById(req.user.id);
    const dayStart = new Date(leaveDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(leaveDate); dayEnd.setHours(23, 59, 59, 999);

    const already = agent.leaves.find((l) => {
      const d = new Date(l.date);
      return d >= dayStart && d <= dayEnd && l.status !== 'rejected';
    });
    if (already) return res.status(400).json({ success: false, message: 'Leave already applied for this date' });

    agent.leaves.push({ date: leaveDate, reason: reason || '' });
    await agent.save();
    res.json({ success: true, data: agent.leaves.sort((a, b) => new Date(a.date) - new Date(b.date)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/agents/leave/:leaveId — cancel a leave
router.delete('/leave/:leaveId', authorize('agent'), async (req, res) => {
  try {
    await Agent.findByIdAndUpdate(req.user.id, { $pull: { leaves: { _id: req.params.leaveId } } });
    res.json({ success: true, message: 'Leave cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Complaints / Issues ──────────────────────────────────────────────────────

// GET /api/v1/agents/complaints — low-rated reviews from customers
router.get('/complaints', authorize('agent'), async (req, res) => {
  try {
    const reviews = await Review.find({ agentId: req.user.id, rating: { $lte: 3 } })
      .populate('customerId', 'name')
      .populate('bookingId', 'bookingCode scheduledAt')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
