const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AgentChangeRequest = require('../models/AgentChangeRequest');
const UserSubscription = require('../models/UserSubscription');
const otpService = require('../services/otp.service');
const assignmentService = require('../services/assignment.service');
const invoiceService = require('../services/invoice.service');
const notificationService = require('../services/notification.service');
const uploadService = require('../services/upload.service');
const { getSurgeMultiplier, applySurge } = require('../services/surge.service');

// POST /api/v1/bookings — Create booking
exports.createBooking = async (req, res) => {
  try {
    const { serviceId, packageName, address, scheduledAt, couponCode, paymentMethod, preferredAgentId, loyaltyPointsUsed: loyaltyPointsRequested = 0 } = req.body;
    const customerId = req.user.id;

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: 'Service not found' });

    // Determine price
    let baseAmount = service.getPriceForCity(address.city);
    if (packageName) {
      const pkg = service.packages.find((p) => p.name === packageName);
      if (pkg) baseAmount = pkg.price;
    }

    // Apply surge pricing (EN9) — FIRST, before any discounts
    const surge = getSurgeMultiplier(scheduledAt, address.city);
    const surgedBaseAmount = applySurge(baseAmount, surge.multiplier);
    const surgeAmount = surgedBaseAmount - baseAmount;
    // All subsequent discount calculations operate on the surged price
    baseAmount = surgedBaseAmount;

    // Apply coupon
    let discountAmount = 0;
    let couponId = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && new Date() >= coupon.validFrom && new Date() <= coupon.validUntil) {
        if (baseAmount >= coupon.minOrderValue) {
          discountAmount = coupon.type === 'flat' ? coupon.value
            : Math.min(coupon.value / 100 * baseAmount, coupon.maxDiscount || Infinity);
          couponId = coupon._id;
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Apply loyalty points
    // Frontend sends the number of points to redeem (loyaltyPointsRequested = points count)
    // Conversion: 1 point = ₹0.50; max redemption = 50% of order after coupon
    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;
    if (loyaltyPointsRequested > 0) {
      const userDoc = await User.findById(customerId).select('loyaltyPoints');
      const afterCoupon = Math.max(0, baseAmount - discountAmount);
      const requestedPoints = Math.max(0, parseInt(loyaltyPointsRequested) || 0);
      const availablePoints = userDoc?.loyaltyPoints || 0;
      const pointsToUse = Math.min(requestedPoints, availablePoints);
      const rupeeValueOfPoints = pointsToUse * 0.5;                          // convert points → ₹
      const maxByOrder = Math.floor(afterCoupon * 0.5);                       // 50% of order cap
      loyaltyDiscount = Math.min(rupeeValueOfPoints, maxByOrder);
      loyaltyDiscount = Math.max(0, Math.floor(loyaltyDiscount));             // whole rupees only
      // Points actually consumed = loyaltyDiscount / 0.5 (ceiling to avoid fractions)
      loyaltyPointsUsed = loyaltyDiscount > 0 ? Math.ceil(loyaltyDiscount / 0.5) : 0;
    }

    // Apply subscription discount (if customer has active plan with bookings remaining)
    let subscriptionDiscount = 0;
    let subscriptionDocId = null;
    const activeSub = await UserSubscription.findOne({ user: customerId, status: 'active' })
      .populate('plan', 'discountPercent bookingsPerMonth');
    if (activeSub && activeSub.bookingsUsed < activeSub.plan.bookingsPerMonth) {
      const afterCoupon = Math.max(0, baseAmount - discountAmount);
      const rawDiscount = Math.floor(afterCoupon * activeSub.plan.discountPercent / 100);
      subscriptionDiscount = Math.max(0, rawDiscount);
      subscriptionDocId = activeSub._id;
      // Increment bookingsUsed on the subscription
      await UserSubscription.findByIdAndUpdate(activeSub._id, { $inc: { bookingsUsed: 1 } });
    }

    // Validate preferred agent if provided
    let resolvedAgentId = null;
    if (preferredAgentId) {
      const Agent = require('../models/Agent');
      const agent = await Agent.findOne({ _id: preferredAgentId, city: address.city, isApproved: true, isActive: true });
      if (agent) resolvedAgentId = agent._id;
    }

    const booking = await Booking.create({
      customerId, serviceId, packageName, address,
      scheduledAt: new Date(scheduledAt),
      couponId, couponCode,
      surgeMultiplier: surge.multiplier,
      surgeLabel: surge.label,
      surgeAmount,
      baseAmount, discountAmount,
      loyaltyPointsUsed,
      loyaltyDiscount,
      subscriptionDiscount,
      subscriptionId: subscriptionDocId,
      finalAmount: Math.max(0, baseAmount - discountAmount - loyaltyDiscount - subscriptionDiscount),
      paymentMethod: paymentMethod || 'cod',
      status: resolvedAgentId ? 'assigned' : 'confirmed',
      agentId: resolvedAgentId,
    });

    const userInc = { totalBookings: 1 };
    const userPush = {};
    if (loyaltyPointsUsed > 0) {
      userInc.loyaltyPoints = -loyaltyPointsUsed;
      userPush['loyaltyTransactions'] = {
        type: 'redeemed',
        points: loyaltyPointsUsed,
        description: `Redeemed for booking ${booking.bookingCode}`,
        refId: booking._id.toString(),
      };
    }
    const userUpdate = { $inc: userInc };
    if (Object.keys(userPush).length) userUpdate.$push = userPush;
    await User.findByIdAndUpdate(customerId, userUpdate);
    await AuditLog.create({ type: 'booking_created', bookingId: booking._id, userId: customerId, role: 'customer' });

    // Trigger auto-assignment only if no preferred agent was set
    const io = req.app.get('io');
    if (!resolvedAgentId) {
      setImmediate(() => assignmentService.assignNearestAgent(booking._id, io));
    } else {
      // Preferred agent was resolved — notify customer that agent is already assigned
      setImmediate(() =>
        notificationService.sendPushNotification(
          customerId,
          {
            title: 'Agent Assigned',
            body: 'Your preferred agent has been confirmed for your booking.',
            url: `/bookings/${booking._id}`,
          },
          'customer',
        ),
      );
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/bookings/:id
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId', 'name images durationMinutes emoji')
      .populate('agentId', 'name profileImage rating phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/bookings — My bookings (customer)
exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customerId: req.user.id };
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter).populate('serviceId', 'name images').populate('agentId', 'name profileImage rating').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, data: bookings, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/bookings/:id/en-route — Agent marks themselves en route
exports.markEnRoute = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (!booking.agentId || booking.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden — you are not the assigned agent' });
    }
    // Idempotent: already en_route → return success without re-writing
    if (booking.status === 'en_route') return res.json({ success: true, status: 'en_route' });

    if (!['assigned', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark en-route from status: ${booking.status}` });
    }

    await Booking.findByIdAndUpdate(booking._id, { status: 'en_route' });

    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:status', { bookingId: booking._id, status: 'en_route' });
    AuditLog.create({ type: 'agent_status_change', bookingId: booking._id, userId: req.user.id, role: 'agent', meta: { status: 'en_route' } }).catch(() => {});
    notificationService.sendPushNotification(
      booking.customerId.toString(),
      { title: 'Agent is on the way', body: 'Your agent is heading to your location.', url: `/bookings/${booking._id}` },
      'customer',
    ).catch(() => {});

    res.json({ success: true, status: 'en_route' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/bookings/:id/arrived — Agent marks themselves arrived
exports.markArrived = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (!booking.agentId || booking.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden — you are not the assigned agent' });
    }
    // Idempotent: already arrived → return success without re-writing
    if (booking.status === 'arrived') return res.json({ success: true, status: 'arrived' });

    // Accept any pre-arrived status so agents can skip steps if needed
    if (!['assigned', 'confirmed', 'en_route'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark arrived from status: ${booking.status}` });
    }

    await Booking.findByIdAndUpdate(booking._id, { status: 'arrived' });

    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:status', { bookingId: booking._id, status: 'arrived' });
    AuditLog.create({ type: 'agent_status_change', bookingId: booking._id, userId: req.user.id, role: 'agent', meta: { status: 'arrived' } }).catch(() => {});
    notificationService.sendPushNotification(
      booking.customerId.toString(),
      { title: 'Agent has arrived', body: 'Your agent is at your location.', url: `/bookings/${booking._id}` },
      'customer',
    ).catch(() => {});

    res.json({ success: true, status: 'arrived' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/send-start-otp — Issue START OTP to customer
exports.sendStartOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customerId', 'phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'arrived') return res.status(400).json({ success: false, message: 'Agent must be at location first' });

    const { hashed, raw } = await otpService.issueOtp(booking.customerId.phone, booking._id, 'start');
    await Booking.findByIdAndUpdate(booking._id, {
      'startOtp.code': hashed,
      'startOtp.issuedAt': new Date(),
      'startOtp.attempts': 0,
      'startOtp.isLocked': false,
    });
    await AuditLog.create({ type: 'otp_issued', bookingId: booking._id, userId: req.user.id, role: req.user.role, meta: { phase: 'start' } });
    res.json({ success: true, message: 'OTP sent to customer', ...(process.env.OTP_DEV_MODE === 'true' && { devOtp: raw }) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/verify-start — Agent enters START OTP
exports.verifyStartOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const result = await otpService.validateOtp(booking._id, 'start', otp, req.user.id);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });

    await Booking.findByIdAndUpdate(booking._id, {
      status: 'in_progress',
      serviceStartedAt: new Date(),
      'startOtp.verifiedAt': new Date(),
    });

    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:started', { bookingId: booking._id, startedAt: new Date() });
    await AuditLog.create({ type: 'service_started', bookingId: booking._id, userId: req.user.id, role: 'agent' });
    notificationService.sendPushNotification(
      booking.customerId.toString(),
      { title: 'Service started', body: 'Your service is now in progress.', url: `/bookings/${booking._id}` },
      'customer',
    ).catch(() => {});

    res.json({ success: true, message: 'Service started' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/send-end-otp — Issue END OTP to customer
exports.sendEndOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('customerId', 'phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Service is not in progress' });

    const { hashed, raw } = await otpService.issueOtp(booking.customerId.phone, booking._id, 'end');
    await Booking.findByIdAndUpdate(booking._id, {
      'endOtp.code': hashed,
      'endOtp.issuedAt': new Date(),
      'endOtp.attempts': 0,
      'endOtp.isLocked': false,
    });
    await AuditLog.create({ type: 'otp_issued', bookingId: booking._id, userId: req.user.id, role: req.user.role, meta: { phase: 'end' } });

    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:end-otp-sent', { bookingId: booking._id });

    res.json({ success: true, message: 'End OTP sent to customer', ...(process.env.OTP_DEV_MODE === 'true' && { devOtp: raw }) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/verify-end — Agent enters END OTP
exports.verifyEndOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Service is not in progress' });

    const result = await otpService.validateOtp(booking._id, 'end', otp, req.user.id);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });

    const completedAt = new Date();
    await Booking.findByIdAndUpdate(booking._id, {
      status: 'completed',
      serviceEndedAt: completedAt,
      'endOtp.verifiedAt': completedAt,
    });

    // Award loyalty points: 10 points per ₹100 spent (based on finalAmount after all discounts)
    const pointsEarned = Math.floor(booking.finalAmount / 100) * 10;
    const userUpdate = { $inc: { totalSpent: booking.finalAmount } };
    if (pointsEarned > 0) {
      userUpdate.$inc.loyaltyPoints = pointsEarned;
      userUpdate.$push = {
        loyaltyTransactions: {
          type: 'earned',
          points: pointsEarned,
          description: `Earned from booking ${booking.bookingCode || booking._id}`,
          refId: booking._id.toString(),
        },
      };
    }
    await User.findByIdAndUpdate(booking.customerId, userUpdate);

    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:completed', { bookingId: booking._id, completedAt });
    io?.to(`booking_${booking._id}`).emit('booking:review-pending', { bookingId: booking._id });
    await AuditLog.create({ type: 'service_ended', bookingId: booking._id, userId: req.user.id, role: 'agent' });

    // Generate invoice asynchronously — do not block the response
    setImmediate(async () => {
      try {
        const [fullBooking, service, customer] = await Promise.all([
          Booking.findById(booking._id),
          Service.findById(booking.serviceId, 'name durationMinutes'),
          User.findById(booking.customerId, 'name phone email'),
        ]);
        const { url } = await invoiceService.generateInvoice(fullBooking, service, customer);
        if (url) {
          await Booking.findByIdAndUpdate(booking._id, { invoiceUrl: url });
          io?.to(`booking_${booking._id}`).emit('booking:invoice-ready', { bookingId: booking._id, invoiceUrl: url });
        }
      } catch (e) {
        const logger = require('../utils/logger');
        logger.error(`Invoice generation failed for booking ${booking._id}: ${e.message}`);
      }
    });

    res.json({ success: true, message: 'Service completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/bookings/:id/cancel
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }
    await Booking.findByIdAndUpdate(booking._id, {
      status: 'cancelled',
      cancelReason: reason || 'Cancelled by user',
      cancelledBy: req.user.role,
    });
    const io = req.app.get('io');
    io?.to(`booking_${booking._id}`).emit('booking:cancelled', { bookingId: booking._id, reason });
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/photos — Agent uploads before/after proof photos
// Expects multipart/form-data with field `photos` (up to 3 files) and body field `type` ('before' | 'after')
exports.uploadJobPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!['before', 'after'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'before' or 'after'" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    if (files.length > 3) {
      return res.status(400).json({ success: false, message: 'Maximum 3 photos allowed per upload' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only the assigned agent may upload photos
    if (!booking.agentId || booking.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden — you are not the assigned agent for this booking' });
    }

    // Must be arrived or in_progress
    if (!['arrived', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Photos can only be uploaded when arrived or in progress' });
    }

    // Upload all files concurrently
    const folder = `job-photos/${id}/${type}`;
    const uploadedUrls = await Promise.all(
      files.map((file) => uploadService.uploadToS3(file.buffer, file.mimetype, folder))
    );

    // Push to booking.agentPhotos[type]
    const newEntries = uploadedUrls.map((url) => ({ url, uploadedAt: new Date() }));
    await Booking.findByIdAndUpdate(id, {
      $push: { [`agentPhotos.${type}`]: { $each: newEntries } },
    });

    await AuditLog.create({
      type: 'photo_uploaded',
      bookingId: booking._id,
      userId: req.user.id,
      role: 'agent',
      meta: { photoType: type, count: files.length },
    });

    const updated = await Booking.findById(id).select('agentPhotos');
    res.json({ success: true, message: `${files.length} photo(s) uploaded`, data: updated.agentPhotos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/bookings/:id/request-agent-change
exports.requestAgentChange = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: 'Reason is required' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (['in_progress', 'completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot request agent change at this stage' });
    }

    const existing = await AgentChangeRequest.findOne({ bookingId: req.params.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A change request is already pending for this booking' });
    }

    const changeRequest = await AgentChangeRequest.create({
      bookingId: req.params.id,
      customerId: req.user.id,
      fromAgentId: booking.agentId || null,
      reason: reason.trim(),
    });

    res.status(201).json({ success: true, message: 'Change request submitted', data: changeRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
