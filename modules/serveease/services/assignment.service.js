const Agent = require('../models/Agent');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { getDistanceKm } = require('../utils/geoDistance');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

const JOB_OFFER_TIMEOUT_MS = 30000; // 30 seconds per agent

/**
 * Find the nearest available online agent for a booking and offer the job.
 * Tries agents in order of proximity, with a timeout per agent.
 */
const assignNearestAgent = async (bookingId, io) => {
  const booking = await Booking.findById(bookingId).populate('serviceId');
  if (!booking) return;

  const { lat, lng, city } = booking.address;

  // Find all online approved agents in the city who have the required skill
  const candidates = await Agent.find({
    city,
    status: 'online',
    isApproved: true,
    isActive: true,
    skills: booking.serviceId.categoryId,
    'currentLocation.lat': { $exists: true, $ne: null },
  });

  if (!candidates.length) {
    await Booking.findByIdAndUpdate(bookingId, { status: 'no_agent' });
    io?.to(`booking_${bookingId}`).emit('booking:no_agent', { bookingId });
    logger.warn(`No available agents for booking ${bookingId} in ${city}`);
    return;
  }

  // Sort by distance
  const sorted = candidates
    .map((agent) => ({
      agent,
      distance: getDistanceKm(lat, lng, agent.currentLocation.lat, agent.currentLocation.lng),
    }))
    .sort((a, b) => a.distance - b.distance);

  for (const { agent, distance } of sorted) {
    const accepted = await offerJobToAgent(agent, bookingId, io, JOB_OFFER_TIMEOUT_MS);
    if (accepted) {
      await Booking.findByIdAndUpdate(bookingId, { agentId: agent._id, status: 'assigned' });
      await Agent.findByIdAndUpdate(agent._id, { status: 'busy' });
      await AuditLog.create({ type: 'booking_assigned', bookingId, userId: agent._id, role: 'agent', meta: { distance } });
      const eta = Math.round(distance * 3); // rough ETA: 3 min/km
      io?.to(`booking_${bookingId}`).emit('booking:assigned', {
        agentId: agent._id,
        agentName: agent.name,
        agentRating: agent.rating,
        eta,
      });
      // Fire push notification to customer — fire-and-forget
      notificationService.sendPushNotification(
        booking.customerId,
        {
          title: 'Agent Assigned',
          body: `${agent.name} has been assigned to your booking. ETA ~${eta} min.`,
          url: `/bookings/${bookingId}`,
        },
        'customer',
      ).catch((e) => logger.error(`[WebPush] agent assigned notify failed: ${e.message}`));
      logger.info(`Booking ${bookingId} assigned to agent ${agent._id} (${distance.toFixed(1)} km)`);
      return;
    }
  }

  await Booking.findByIdAndUpdate(bookingId, { status: 'no_agent' });
  io?.to(`booking_${bookingId}`).emit('booking:no_agent', { bookingId });
  logger.warn(`All agents rejected booking ${bookingId}`);
};

const offerJobToAgent = (agent, bookingId, io, timeoutMs) =>
  new Promise((resolve) => {
    io?.to(`agent_${agent._id}`).emit('job:offer', { bookingId, timeout: timeoutMs });
    const timer = setTimeout(() => resolve(false), timeoutMs);
    io?.once(`job:response:${bookingId}:${agent._id}`, ({ accepted }) => {
      clearTimeout(timer);
      resolve(accepted);
    });
  });

module.exports = { assignNearestAgent };
