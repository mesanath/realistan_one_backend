'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getPropetiesList, getPropetiesDetails, addProperty, editProperty } = require('../controllers/property.controller');
const { addPropertySchema, editPropertySchema, propertyIDParamSchema } = require('../validators/property.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getPropetiesList
);

router.get(
    '/:propertyID',
    authenticate,
    requireAccess('User', 'read'),
    validate(propertyIDParamSchema, 'params'),
    getPropetiesDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addPropertySchema),
    addProperty
);

router.put(
    '/:propertyID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(propertyIDParamSchema, 'params'),
    validate(editPropertySchema),
    editProperty
);

module.exports = router;
