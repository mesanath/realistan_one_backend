'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { authenticateOptional } = require('../../../src/middleware/realestate-auth.middleware');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

// Guest-accessible — auth populates req.user when a token is present, otherwise req.user = null
router.post('/requestcallback', apiRateLimit, authenticateOptional, ctrl.requestCallback);

module.exports = router;
