'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const logger = require('./utils/logger');
const requestId = require('./middleware/requestId.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');

// ─── Module routers ────────────────────────────────────────────────────────────

// Unified auth & admin auth (cross-module)
const unifiedAuthRoutes      = require('./auth/unifiedAuth.routes');
const unifiedAdminAuthRoutes = require('./adminAuth/adminAuth.routes');

// Realestate (customer-facing real estate API)
const realestateAuthRoutes     = require('../modules/realestate/routes/auth.routes');
const realestatePropertyRoutes = require('../modules/realestate/routes/property.routes');
const realestateArticleRoutes  = require('../modules/realestate/routes/article.routes');
const realestateContactRoutes  = require('../modules/realestate/routes/contact.routes');

// Realestate Admin (admin management panel)
const adminAuthRoutes      = require('../modules/realestate-admin/routes/auth.routes');
const adminAdminRoutes     = require('../modules/realestate-admin/routes/admin.routes');
const adminPropertyRoutes  = require('../modules/realestate-admin/routes/property.routes');
const adminHomepageRoutes  = require('../modules/realestate-admin/routes/homepage.routes');
const adminArticlesRoutes  = require('../modules/realestate-admin/routes/articles.routes');
const adminBannersRoutes   = require('../modules/realestate-admin/routes/banners.routes');
const adminDashboardRoutes = require('../modules/realestate-admin/routes/dashboard.routes');
const adminProfilesRoutes  = require('../modules/realestate-admin/routes/profiles.routes');
const adminLeaseRoutes     = require('../modules/realestate-admin/routes/lease.routes');
const adminLoansRoutes     = require('../modules/realestate-admin/routes/loans.routes');
const adminPincodesRoutes  = require('../modules/realestate-admin/routes/pincodes.routes');

// ServeEase (home services marketplace)
const serveeaseAuthRoutes         = require('../modules/serveease/routes/auth.routes');
const serveeaseServiceRoutes      = require('../modules/serveease/routes/service.routes');
const serveeaseBookingRoutes      = require('../modules/serveease/routes/booking.routes');
const serveeaseAgentRoutes        = require('../modules/serveease/routes/agent.routes');
const serveeaseAdminRoutes        = require('../modules/serveease/routes/admin.routes');
const serveeasePaymentRoutes      = require('../modules/serveease/routes/payment.routes');
const serveeaseCouponRoutes       = require('../modules/serveease/routes/coupon.routes');
const serveeaseNotificationRoutes = require('../modules/serveease/routes/notification.routes');
const serveeaseReviewRoutes       = require('../modules/serveease/routes/review.routes');
const serveeaseUploadRoutes       = require('../modules/serveease/routes/upload.routes');
const serveeaseDisputeRoutes      = require('../modules/serveease/routes/dispute.routes');
const serveeaseRecommenderRoutes  = require('../modules/serveease/routes/recommender.routes');
const serveeaseSubscriptionRoutes = require('../modules/serveease/routes/subscription.routes');
const serveeaseCorporateRoutes    = require('../modules/serveease/routes/corporate.routes');
const serveeaseBundleRoutes       = require('../modules/serveease/routes/bundle.routes');

const app = express();

// ─── Security & parsing middleware ────────────────────────────────────────────
app.use(requestId);
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map(s => s.trim())
    : [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// ─── Health checks ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));
app.get('/health/live', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));
app.get('/api/v1/health', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));

// ─── Routes: Unified (cross-module) ──────────────────────────────────────────
app.use('/api/v1/auth',        unifiedAuthRoutes);       // realestate + serveease OTP (type param)
app.use('/api/v1/admin-auth',  unifiedAdminAuthRoutes);  // super admin login for both panels

// ─── Routes: Realestate (/api/v1/realestate/) ────────────────────────────────
app.use('/api/v1/realestate/auth',       realestateAuthRoutes);
app.use('/api/v1/realestate/properties', realestatePropertyRoutes);
app.use('/api/v1/realestate/articles',   realestateArticleRoutes);
app.use('/api/v1/realestate/contact',    realestateContactRoutes);

// ─── Routes: Realestate Admin (/api/v1/realestate-admin/) ────────────────────
app.use('/api/v1/realestate-admin/auth',       adminAuthRoutes);
app.use('/api/v1/realestate-admin/admin',      adminAdminRoutes);
app.use('/api/v1/realestate-admin/properties', adminPropertyRoutes);
app.use('/api/v1/realestate-admin/homepage',   adminHomepageRoutes);
app.use('/api/v1/realestate-admin/articles',   adminArticlesRoutes);
app.use('/api/v1/realestate-admin/banners',    adminBannersRoutes);
app.use('/api/v1/realestate-admin/dashboard',  adminDashboardRoutes);
app.use('/api/v1/realestate-admin/profiles',   adminProfilesRoutes);
app.use('/api/v1/realestate-admin/lease',      adminLeaseRoutes);
app.use('/api/v1/realestate-admin/loans',      adminLoansRoutes);
app.use('/api/v1/realestate-admin/pincodes',   adminPincodesRoutes);

// ─── Routes: ServeEase (/api/v1/serveease/) ───────────────────────────────────
app.use('/api/v1/serveease/auth',              serveeaseAuthRoutes);
app.use('/api/v1/serveease/services',          serveeaseServiceRoutes);
app.use('/api/v1/serveease/bookings',          serveeaseBookingRoutes);
app.use('/api/v1/serveease/agents',            serveeaseAgentRoutes);
app.use('/api/v1/serveease/admin',             serveeaseAdminRoutes);
app.use('/api/v1/serveease/payments',          serveeasePaymentRoutes);
app.use('/api/v1/serveease/coupons',           serveeaseCouponRoutes);
app.use('/api/v1/serveease/notifications',     serveeaseNotificationRoutes);
app.use('/api/v1/serveease/reviews',           serveeaseReviewRoutes);
app.use('/api/v1/serveease/upload',            serveeaseUploadRoutes);
app.use('/api/v1/serveease/disputes',          serveeaseDisputeRoutes);
app.use('/api/v1/serveease/recommendations',   serveeaseRecommenderRoutes);
app.use('/api/v1/serveease/subscriptions',     serveeaseSubscriptionRoutes);
app.use('/api/v1/serveease/corporate-bookings', serveeaseCorporateRoutes);
app.use('/api/v1/serveease/services/:id/bundles', serveeaseBundleRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
