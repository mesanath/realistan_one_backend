const express = require('express');
const { getBundleSuggestionsHandler } = require('../controllers/bundle.controller');

const router = express.Router({ mergeParams: true });

// GET /api/v1/services/:id/bundles — public, no auth
router.get('/', getBundleSuggestionsHandler);

module.exports = router;
