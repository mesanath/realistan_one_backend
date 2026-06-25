const CorporateBooking = require('../models/CorporateBooking');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Bulk discount tiers
function getBulkDiscount(slotCount) {
  if (slotCount >= 10) return 20;
  if (slotCount >= 5)  return 15;
  if (slotCount >= 2)  return 10;
  return 0;
}

const GST_RATE = 0.18;

// POST /api/v1/corporate-bookings
exports.createCorporateBooking = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Verify customer has corporate account enabled
    const customer = await User.findById(customerId).select('corporate name');
    if (!customer?.corporate?.isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Corporate account not enabled. Please register and wait for admin approval.',
      });
    }

    const { slots, paymentType = 'prepaid', notes = '' } = req.body;

    if (!Array.isArray(slots) || slots.length < 1) {
      return res.status(400).json({ success: false, message: 'At least one slot is required.' });
    }
    if (slots.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 slots per corporate booking.' });
    }

    // Validate and price each slot
    const enrichedSlots = [];
    let totalAmount = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const { serviceId, address, city, scheduledAt, units = 1 } = slot;

      if (!serviceId || !address || !city || !scheduledAt) {
        return res.status(400).json({
          success: false,
          message: `Slot ${i + 1} is missing required fields (serviceId, address, city, scheduledAt).`,
        });
      }

      const parsedUnits = Math.max(1, Math.min(10, parseInt(units) || 1));
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: `Slot ${i + 1} has an invalid or past scheduledAt date.`,
        });
      }

      const service = await Service.findById(serviceId);
      if (!service || !service.isActive) {
        return res.status(404).json({
          success: false,
          message: `Slot ${i + 1}: service not found or inactive.`,
        });
      }

      const unitPrice = service.getPriceForCity(city) || service.basePrice || 0;
      totalAmount += unitPrice * parsedUnits;

      enrichedSlots.push({
        serviceId,
        address,
        city,
        scheduledAt: scheduledDate,
        units: parsedUnits,
        unitPrice,
        bookingId: null,
      });
    }

    // Compute discount and GST
    const discountPercent = getBulkDiscount(enrichedSlots.length);
    const discountAmount = Math.round(totalAmount * discountPercent / 100);
    const afterDiscount = totalAmount - discountAmount;
    const gstAmount = Math.round(afterDiscount * GST_RATE);
    const finalAmount = afterDiscount + gstAmount;

    // Create individual Booking records for each slot
    const createdBookingIds = [];
    const updatedSlots = [];

    for (const slot of enrichedSlots) {
      const booking = await Booking.create({
        customerId,
        serviceId: slot.serviceId,
        address: {
          label: 'Work',
          addressLine: slot.address,
          city: slot.city,
        },
        scheduledAt: slot.scheduledAt,
        baseAmount: slot.unitPrice * slot.units,
        discountAmount: 0,
        finalAmount: slot.unitPrice * slot.units, // individual bookings carry no discount — discount is at corp level
        paymentMethod: paymentType === 'invoice' ? 'cod' : 'card',
        status: 'confirmed',
        notes: `Corporate booking — ${slot.units} unit(s)`,
      });
      createdBookingIds.push(booking._id);
      updatedSlots.push({ ...slot, bookingId: booking._id });
    }

    // Create CorporateBooking record
    const corporateBooking = await CorporateBooking.create({
      customer: customerId,
      companyName: customer.corporate.companyName,
      slots: updatedSlots,
      totalAmount,
      discountPercent,
      discountAmount,
      gstAmount,
      finalAmount,
      paymentType,
      notes,
      status: 'confirmed',
    });

    // Increment customer totalBookings
    await User.findByIdAndUpdate(customerId, { $inc: { totalBookings: enrichedSlots.length } });

    await AuditLog.create({
      type: 'corporate_booking_created',
      userId: customerId,
      role: 'customer',
      meta: {
        corporateBookingId: corporateBooking._id,
        slotCount: enrichedSlots.length,
        finalAmount,
      },
    });

    res.status(201).json({ success: true, data: corporateBooking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/corporate-bookings — My corporate bookings (customer)
exports.getMyCorporateBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { customer: req.user.id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      CorporateBooking.find(filter)
        .populate('slots.serviceId', 'name emoji')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CorporateBooking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/corporate-bookings/:id — single booking (customer or admin)
exports.getCorporateBookingById = async (req, res) => {
  try {
    const booking = await CorporateBooking.findById(req.params.id)
      .populate('customer', 'name phone email corporate')
      .populate('slots.serviceId', 'name emoji durationMinutes')
      .populate('slots.bookingId', 'bookingCode status paymentStatus agentId');

    if (!booking) return res.status(404).json({ success: false, message: 'Corporate booking not found' });

    // Customers can only access their own bookings
    if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/corporate-bookings/admin/all — admin view (all bookings)
exports.getAdminCorporateBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = CorporateBooking.find(filter)
      .populate('customer', 'name phone email corporate')
      .populate('slots.serviceId', 'name emoji')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const [bookings, total] = await Promise.all([
      query,
      CorporateBooking.countDocuments(filter),
    ]);

    // Optional in-memory search by company name (small result sets)
    let filtered = bookings;
    if (search) {
      const q = search.toLowerCase();
      filtered = bookings.filter((b) =>
        b.companyName?.toLowerCase().includes(q) ||
        b.customer?.name?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      data: filtered,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/corporate-bookings/admin/:id/status — admin updates status
exports.updateCorporateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await CorporateBooking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Not found' });

    await AuditLog.create({
      type: 'corporate_booking_status_updated',
      userId: req.user.id,
      role: 'admin',
      meta: { corporateBookingId: booking._id, status },
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/corporate-bookings/register — customer registers for corporate account
exports.registerCorporate = async (req, res) => {
  try {
    const { companyName, gstNumber, billingAddress, invoiceEmail } = req.body;
    if (!companyName?.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'corporate.companyName': companyName.trim(),
        'corporate.gstNumber': gstNumber?.trim() || null,
        'corporate.billingAddress': billingAddress?.trim() || null,
        'corporate.invoiceEmail': invoiceEmail?.trim() || null,
        'corporate.pendingApproval': true,
        'corporate.isEnabled': false,
      },
      { new: true }
    ).select('corporate name');

    res.json({ success: true, message: 'Corporate registration submitted. Pending admin approval.', data: user.corporate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/corporate-bookings/admin/pending-registrations — admin: list pending approvals
exports.getPendingCorporateRegistrations = async (req, res) => {
  try {
    const users = await User.find({ 'corporate.pendingApproval': true }).select('name phone email corporate createdAt');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/corporate-bookings/admin/approve/:userId — admin approves corporate account
exports.approveCorporateAccount = async (req, res) => {
  try {
    const { creditLimit = 0 } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        'corporate.isEnabled': true,
        'corporate.pendingApproval': false,
        'corporate.creditLimit': Math.max(0, parseInt(creditLimit) || 0),
      },
      { new: true }
    ).select('name phone corporate');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await AuditLog.create({
      type: 'corporate_account_approved',
      userId: req.user.id,
      role: 'admin',
      meta: { approvedUserId: user._id, companyName: user.corporate.companyName },
    });

    res.json({ success: true, message: 'Corporate account approved.', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
