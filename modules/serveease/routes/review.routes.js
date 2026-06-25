const router = require('express').Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Agent = require('../models/Agent');
const Service = require('../models/Service');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

// POST /api/v1/reviews
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const { bookingId, rating, comment, tags, tip } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Invalid booking' });
    }
    if (booking.status !== 'completed') return res.status(400).json({ success: false, message: 'Booking not completed' });
    if (booking.review) return res.status(400).json({ success: false, message: 'Already reviewed' });

    const review = await Review.create({
      bookingId, customerId: req.user.id,
      agentId: booking.agentId, serviceId: booking.serviceId,
      rating, comment, tags, tip: tip || 0,
    });
    await Booking.findByIdAndUpdate(bookingId, { review: review._id });

    // Update agent's average rating
    const agentReviews = await Review.find({ agentId: booking.agentId });
    const avg = agentReviews.reduce((s, r) => s + r.rating, 0) / agentReviews.length;
    await Agent.findByIdAndUpdate(booking.agentId, { rating: Math.round(avg * 10) / 10, ratingCount: agentReviews.length });
    await Service.findByIdAndUpdate(booking.serviceId, { $inc: { ratingCount: 1 }, $set: { rating: avg } });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/reviews?serviceId=xxx
router.get('/', async (req, res) => {
  try {
    const { serviceId, agentId, page = 1, limit = 10 } = req.query;
    const filter = { isPublic: true };
    if (serviceId) filter.serviceId = serviceId;
    if (agentId) filter.agentId = agentId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reviews = await Review.find(filter).populate('customerId', 'name profileImage').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
