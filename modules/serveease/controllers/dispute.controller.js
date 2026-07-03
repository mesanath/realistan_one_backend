const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const notificationService = require('../services/notification.service');

// POST /api/v1/disputes — Customer or Agent raises a dispute
exports.createDispute = async (req, res) => {
  try {
    const { bookingId, reason, description } = req.body;
    const isAgent = req.user.role === 'agent';

    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId is required' });
    if (!reason) return res.status(400).json({ success: false, message: 'reason is required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (isAgent) {
      // Agent can only raise disputes on their own assigned bookings
      if (!booking.agentId || booking.agentId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const activeStatuses = ['assigned', 'en_route', 'arrived', 'in_progress', 'completed'];
      if (!activeStatuses.includes(booking.status)) {
        return res.status(400).json({ success: false, message: 'Cannot raise a dispute at this booking stage' });
      }
    } else {
      // Customer can only raise disputes on their own completed bookings
      if (booking.customerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (booking.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Disputes can only be raised on completed bookings' });
      }
    }

    // One dispute per booking per role (agents and customers may each raise one)
    const existing = await Dispute.findOne({ booking: bookingId, raisedByRole: isAgent ? 'agent' : 'customer' });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A dispute has already been raised for this booking' });
    }

    const dispute = await Dispute.create({
      booking: bookingId,
      customer: booking.customerId,
      agent: isAgent ? req.user.id : null,
      raisedByRole: isAgent ? 'agent' : 'customer',
      reason,
      description: description ? description.slice(0, 500) : '',
    });

    AuditLog.create({
      type: 'dispute_created',
      bookingId: booking._id,
      userId: req.user.id,
      role: req.user.role,
      meta: { disputeId: dispute._id, reason, raisedByRole: dispute.raisedByRole },
    }).catch(() => {});

    res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A dispute already exists for this booking' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/disputes — Customer: their disputes | Admin: all disputes
exports.getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, bookingId } = req.query;
    const isAdmin = req.user.role === 'admin';

    const filter = {};
    if (!isAdmin) {
      if (req.user.role === 'agent') {
        filter.agent = req.user.id;
      } else {
        filter.customer = req.user.id;
      }
    }
    if (status) filter.status = status;
    if (bookingId) filter.booking = bookingId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('booking', 'bookingCode finalAmount scheduledAt serviceId')
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: disputes,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/disputes/:id — Customer or admin views one dispute
exports.getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('booking', 'bookingCode finalAmount scheduledAt serviceId paymentStatus')
      .populate('customer', 'name phone email');

    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    // Customers/agents can only view disputes they raised
    if (req.user.role !== 'admin') {
      const isOwner =
        (req.user.role === 'customer' && dispute.customer._id.toString() === req.user.id) ||
        (req.user.role === 'agent' && dispute.agent?.toString() === req.user.id);
      if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/disputes/:id/reply — Admin sends a customer-visible reply (without resolving)
exports.replyToDispute = async (req, res) => {
  try {
    const { adminReply, markUnderReview } = req.body;

    if (!adminReply || !adminReply.trim()) {
      return res.status(400).json({ success: false, message: 'adminReply is required' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    if (['resolved_refund', 'resolved_no_refund', 'closed'].includes(dispute.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reply to a resolved dispute' });
    }

    dispute.adminReply = adminReply.trim().slice(0, 1000);
    if (markUnderReview && dispute.status === 'open') {
      dispute.status = 'under_review';
    }
    await dispute.save();

    // Fire-and-forget: notify customer of admin reply
    notificationService.sendPushNotification(
      dispute.customer.toString(),
      { title: 'Update on your dispute', body: dispute.adminReply.slice(0, 80), url: `/disputes/${dispute._id}` },
      'customer',
    ).catch(() => {});

    res.json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/disputes/:id/resolve — Admin only
exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, refundAmount, adminNote } = req.body;

    if (!resolution || !['refund', 'no_refund'].includes(resolution)) {
      return res.status(400).json({ success: false, message: 'resolution must be "refund" or "no_refund"' });
    }

    const dispute = await Dispute.findById(req.params.id).populate('booking');
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    if (['resolved_refund', 'resolved_no_refund', 'closed'].includes(dispute.status)) {
      return res.status(400).json({ success: false, message: 'Dispute is already resolved' });
    }

    const resolvedAt = new Date();
    const isRefund = resolution === 'refund';
    const newStatus = isRefund ? 'resolved_refund' : 'resolved_no_refund';
    const parsedRefundAmount = isRefund ? Math.max(0, parseFloat(refundAmount) || 0) : 0;

    // Update dispute
    dispute.status = newStatus;
    dispute.refundAmount = parsedRefundAmount;
    dispute.adminNote = adminNote ? adminNote.trim() : '';
    dispute.resolvedAt = resolvedAt;
    await dispute.save();

    // If refund: update payment record + credit customer wallet
    if (isRefund && parsedRefundAmount > 0) {
      const booking = dispute.booking;

      // Update Payment record — add a refund entry to the refunds array
      const payment = await Payment.findOne({ bookingId: booking._id });
      if (payment) {
        payment.refunds.push({
          refundId: `DISPUTE-${dispute._id}`,
          amount: parsedRefundAmount,
          reason: `Dispute resolved — ${dispute.reason}`,
          status: 'processed',
          initiatedBy: 'admin',
          processedAt: resolvedAt,
        });
        // Update payment status
        const totalRefunded = payment.refunds.reduce((sum, r) => sum + (r.status === 'processed' ? r.amount : 0), 0);
        payment.status = totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded';
        await payment.save();

        // Also update booking paymentStatus
        await Booking.findByIdAndUpdate(booking._id, {
          paymentStatus: totalRefunded >= booking.finalAmount ? 'refunded' : 'paid',
        });
      }

      // Credit customer wallet
      const walletTx = {
        type: 'credit',
        amount: parsedRefundAmount,
        description: `Refund for dispute on booking ${booking.bookingCode || booking._id}`,
        createdAt: resolvedAt,
      };
      await User.findByIdAndUpdate(dispute.customer, {
        $inc: { 'wallet.balance': parsedRefundAmount },
        $push: { 'wallet.transactions': walletTx },
      });
    }

    await AuditLog.create({
      type: 'dispute_resolved',
      bookingId: dispute.booking._id || dispute.booking,
      userId: req.user.id,
      role: 'admin',
      meta: { disputeId: dispute._id, resolution, refundAmount: parsedRefundAmount },
    });

    res.json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
