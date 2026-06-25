const router = require('express').Router();
const ctrl = require('../controllers/service.controller');
const { getBundleSuggestionsHandler } = require('../controllers/bundle.controller');
const { authenticate, authorize } = require('../../../src/middleware/serveease-auth.middleware');
const { adminMutationLimit } = require('../../../src/middleware/rateLimit.middleware');
const { createServiceRules, updateServiceRules } = require('../validators/validators');

// Public
router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.getServices);
// Bundle suggestions — must come before generic /:id to avoid swallowing
router.get('/:id/bundles', getBundleSuggestionsHandler);
// Surge price check — EN9 (must be before /:id)
router.get('/:id/surge', ctrl.getSurgePrice);
router.get('/:id', ctrl.getServiceById);

// Admin only
router.post('/categories', authenticate, authorize('admin'), adminMutationLimit, ctrl.createCategory);
router.put('/categories/:id', authenticate, authorize('admin'), adminMutationLimit, ctrl.updateCategory);
router.post('/', authenticate, authorize('admin'), adminMutationLimit, createServiceRules, ctrl.createService);
router.put('/:id', authenticate, authorize('admin'), adminMutationLimit, updateServiceRules, ctrl.updateService);
router.delete('/:id', authenticate, authorize('admin'), adminMutationLimit, ctrl.deleteService);

module.exports = router;
