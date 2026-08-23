'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getLeaseList, getLeaseDetails, addLease, editLease, deleteLease } = require('../controllers/lease.controller');
const { addLeaseSchema, editLeaseSchema, leaseIDParamSchema } = require('../validators/lease.validator');

// Note: PUT (status update) is gated on 'InquiryStatus' rather than 'Inquiries'
// so customer_services_management — which only has InquiryStatus:write — can
// update status without being able to create or delete inquiries.

router.get(
    '/',
    authenticate,
    requireAccess('Inquiries', 'read'),
    getLeaseList
);

router.get(
    '/:leaseID',
    authenticate,
    requireAccess('Inquiries', 'read'),
    validate(leaseIDParamSchema, 'params'),
    getLeaseDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Inquiries', 'write'),
    validate(addLeaseSchema),
    addLease
);

router.put(
    '/:leaseID',
    authenticate,
    requireAccess('InquiryStatus', 'write'),
    validate(leaseIDParamSchema, 'params'),
    validate(editLeaseSchema),
    editLease
);

router.delete(
    '/:leaseID',
    authenticate,
    requireAccess('Inquiries', 'write'),
    validate(leaseIDParamSchema, 'params'),
    deleteLease
);

module.exports = router;
