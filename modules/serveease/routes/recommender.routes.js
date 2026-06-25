const router = require('express').Router();
const ctrl = require('../controllers/recommender.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

// GET /api/v1/recommendations
// Auth-protected — customer only
router.get('/', authenticate, authorize('customer'), ctrl.getRecommendations);

module.exports = router;
