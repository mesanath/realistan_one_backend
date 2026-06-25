const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');

// Both customers and agents can subscribe / unsubscribe
router.post('/subscribe', authenticate, authorize('customer', 'agent'), ctrl.subscribe);
router.delete('/subscribe', authenticate, authorize('customer', 'agent'), ctrl.unsubscribe);

module.exports = router;
