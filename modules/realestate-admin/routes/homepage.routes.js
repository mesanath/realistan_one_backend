'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { addCategories } = require('../controllers/homepage.controller');
const { addCategorySchema } = require('../validators/homepage.validator');

router.post(
    '/categories',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addCategorySchema),
    addCategories
);

module.exports = router;
