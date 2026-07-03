'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getLeaseList, getLeaseDetails, addLease, editLease, deleteLease } = require('../controllers/lease.controller');
const { addLeaseSchema, editLeaseSchema, leaseIDParamSchema } = require('../validators/lease.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getLeaseList
);

router.get(
    '/:leaseID',
    authenticate,
    requireAccess('User', 'read'),
    validate(leaseIDParamSchema, 'params'),
    getLeaseDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addLeaseSchema),
    addLease
);

router.put(
    '/:leaseID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(leaseIDParamSchema, 'params'),
    validate(editLeaseSchema),
    editLease
);

router.delete(
    '/:leaseID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(leaseIDParamSchema, 'params'),
    deleteLease
);

module.exports = router;
