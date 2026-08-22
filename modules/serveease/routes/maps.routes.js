'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/maps.controller');
const { authenticate } = require('../../../src/middleware/serveease-auth.middleware');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

// Requires auth — this proxy spends real Google Maps quota on our key, so it isn't left open
// to anonymous callers. All three routes are used by both customers (picking a service
// address) and agents (their own current-location entry).
router.get('/autocomplete', authenticate, apiRateLimit, ctrl.autocomplete);
router.get('/place-details', authenticate, apiRateLimit, ctrl.placeDetails);
router.get('/directions-url', authenticate, apiRateLimit, ctrl.directionsUrl);

module.exports = router;
