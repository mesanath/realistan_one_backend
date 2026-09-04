'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getPropetiesList, getPropetiesDetails, addProperty, editProperty, deleteProperty } = require('../controllers/property.controller');
const verificationCtrl = require('../controllers/propertyVerification.controller');
const { addPropertySchema, editPropertySchema, propertyIDParamSchema, verificationIdParamSchema, reviewVerificationSchema } = require('../validators/property.validator');

// Mounted before the '/:propertyID' catch-all below — otherwise Express would match
// '/verification' as a propertyID value on that route instead of reaching these.
router.get(
    '/verification',
    authenticate,
    requireAccess('PropertyVerification', 'read'),
    verificationCtrl.getVerificationRequests
);

router.get(
    '/verification/:id',
    authenticate,
    requireAccess('PropertyVerification', 'read'),
    validate(verificationIdParamSchema, 'params'),
    verificationCtrl.getVerificationRequestById
);

router.patch(
    '/verification/:id',
    authenticate,
    requireAccess('PropertyVerification', 'write'),
    validate(verificationIdParamSchema, 'params'),
    validate(reviewVerificationSchema),
    verificationCtrl.reviewVerificationRequest
);

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

router.delete(
    '/:propertyID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(propertyIDParamSchema, 'params'),
    deleteProperty
);

module.exports = router;
