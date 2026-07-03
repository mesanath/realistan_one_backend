'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getPincodesList, getPincodeDetails, addPincode, editPincode, deletePincode } = require('../controllers/pincodes.controller');
const { addPincodeSchema, editPincodeSchema, pincodeIDParamSchema } = require('../validators/pincodes.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getPincodesList
);

router.get(
    '/:pincodeID',
    authenticate,
    requireAccess('User', 'read'),
    validate(pincodeIDParamSchema, 'params'),
    getPincodeDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('User', 'write'),
    validate(addPincodeSchema),
    addPincode
);

router.put(
    '/:pincodeID',
    authenticate,
    requireAccess('User', 'write'),
    validate(pincodeIDParamSchema, 'params'),
    validate(editPincodeSchema),
    editPincode
);

router.delete(
    '/:pincodeID',
    authenticate,
    requireAccess('User', 'write'),
    validate(pincodeIDParamSchema, 'params'),
    deletePincode
);

module.exports = router;
