const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Agent = require('../../modules/serveease/models/Agent');
const Booking = require('../../modules/serveease/models/Booking');
const AuditLog = require('../../modules/serveease/models/AuditLog');
const logger = require('../utils/logger');

let _io = null;
const getIo = () => _io;

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
      credentials: true,
    },
  });
  _io = io;

  // ─── Auth middleware ───────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch {
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
        socket.user = { id: decoded._id || decoded.id, role: 'realestate_user' };
        return next();
      } catch {
        return next(new Error('Invalid token'));
      }
    }
  });

  io.on('connection', async (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`Socket connected: ${role} ${userId}`);

    // Join personal room
    socket.join(`${role}_${userId}`);

    // Agent: auto-join active booking room so they receive booking:status events
    if (role === 'agent') {
      try {
        const activeBooking = await Booking.findOne({
          agentId: userId,
          status: { $in: ['assigned', 'en_route', 'arrived', 'in_progress'] },
        }).select('_id');
        if (activeBooking) {
          socket.join(`booking_${activeBooking._id}`);
          logger.info(`Agent ${userId} auto-joined booking_${activeBooking._id}`);
        }
      } catch (err) {
        logger.error(`[Socket] Agent booking room auto-join failed: ${err.message}`);
      }
    }

    // ─── Realestate: join owner room ──────────────────────
    socket.on('realestate:join_room', () => {
      if (socket.user.role === 'realestate_user') {
        socket.join(`realestate_${socket.user.id}`);
      }
    });

    // ─── Customer: join/leave booking room ───────────────
    socket.on('booking:join', ({ bookingId }) => {
      socket.join(`booking_${bookingId}`);
    });

    socket.on('leave:booking', ({ bookingId }) => {
      socket.leave(`booking_${bookingId}`);
    });

    // ─── Any role: join/leave agent location room ─────────
    socket.on('join:agent', ({ agentId }) => {
      socket.join(`agent_${agentId}`);
    });

    socket.on('leave:agent', ({ agentId }) => {
      socket.leave(`agent_${agentId}`);
    });

    // ─── Heartbeat from useAgentLocation hook ─────────────
    socket.on('ping:agent', () => {
      // no-op — keeps the connection alive
    });

    // ─── Agent: update live location ──────────────────────
    socket.on('agent:location', async ({ lat, lng, bookingId }) => {
      if (role !== 'agent') return;
      await Agent.findByIdAndUpdate(userId, {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.updatedAt': new Date(),
      });
      // Booking room: customer tracking page listens for agent:location:update
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('agent:location:update', { lat, lng });
      }
      // Agent room: useAgentLocation hook (customer + admin live map) listens for agent:location
      io.to(`agent_${userId}`).emit('agent:location', { lat, lng });
    });

    // ─── Agent: accept/reject job offer ───────────────────
    socket.on('job:response', ({ bookingId, accepted }) => {
      io.emit(`job:response:${bookingId}:${userId}`, { accepted });
    });

    // ─── Agent: arrived at customer location ──────────────
    socket.on('agent:arrived', async ({ bookingId }) => {
      await Booking.findByIdAndUpdate(bookingId, { status: 'arrived' });
      io.to(`booking_${bookingId}`).emit('booking:agent_arrived', { bookingId });
    });

    // ─── SOS triggered by customer ────────────────────────
    socket.on('sos:trigger', async ({ bookingId }) => {
      await AuditLog.create({ type: 'sos_triggered', bookingId, userId, role: 'customer' });
      io.to('admin_room').emit('sos:alert', { bookingId, customerId: userId });
      logger.warn(`SOS triggered by customer ${userId} for booking ${bookingId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${role} ${userId}`);
      if (role === 'agent') {
        Agent.findByIdAndUpdate(userId, { status: 'offline' }).catch(() => {});
      }
    });
  });

  return io;
};

module.exports = initSocket;
module.exports.getIo = getIo;
