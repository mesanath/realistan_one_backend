'use strict';
require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const logger = require('./src/utils/logger');

// ─── Native MongoDB connection (realestate + admin modules) ──────────────────
connectDB();

// ─── Mongoose connection (serveease module) ───────────────────────────────────
const { connectMongoose } = require('./modules/serveease/config/mongoose');
connectMongoose();

// ─── Redis connection (serveease module) ─────────────────────────────────────
const { connectRedis } = require('./modules/serveease/config/redis');
connectRedis().catch(err => logger.warn('Redis connection failed (non-fatal):', err.message));

// ─── HTTP server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

// ─── Socket.io (on separate port) ────────────────────────────────────────────
const socketPort = parseInt(process.env.SOCKET_PORT || '3002', 10);
const socketHttpServer = http.createServer();
const initSocket = require('./src/socket/index');
initSocket(socketHttpServer);

if (require.main === module) {
    server.listen(PORT, () => {
        logger.info(`Realistan One Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        logger.info('Routes:');
        logger.info('  /api/v1/realestate/*        → Realestate customer API');
        logger.info('  /api/v1/realestate-admin/*  → Realestate admin API');
        logger.info('  /api/v1/serveease/*         → ServeEase home services API');
    });

    socketHttpServer.listen(socketPort, () => {
        logger.info(`Socket.io server listening on port ${socketPort}`);
    });

    server.on('error', (err) => {
        logger.error('Server error:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
        logger.error('Unhandled rejection:', err);
    });
}

module.exports = { app, server };
