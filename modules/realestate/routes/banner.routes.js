'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/banner.controller');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

// Public, unauthenticated — the home page fetches these to render feature banners.
router.get('/', apiRateLimit, ctrl.getFeatureBanners);

module.exports = router;
