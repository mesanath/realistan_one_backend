'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getLoansList, getLoanDetails, addLoan, editLoan, deleteLoan } = require('../controllers/loans.controller');
const { addLoanSchema, editLoanSchema, loanIDParamSchema } = require('../validators/loans.validator');

// Note: PUT (status update) is gated on 'InquiryStatus' rather than 'Inquiries'
// so customer_services_management — which only has InquiryStatus:write — can
// update status without being able to create or delete inquiries.

router.get(
    '/',
    authenticate,
    requireAccess('Inquiries', 'read'),
    getLoansList
);

router.get(
    '/:loanID',
    authenticate,
    requireAccess('Inquiries', 'read'),
    validate(loanIDParamSchema, 'params'),
    getLoanDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Inquiries', 'write'),
    validate(addLoanSchema),
    addLoan
);

router.put(
    '/:loanID',
    authenticate,
    requireAccess('InquiryStatus', 'write'),
    validate(loanIDParamSchema, 'params'),
    validate(editLoanSchema),
    editLoan
);

router.delete(
    '/:loanID',
    authenticate,
    requireAccess('Inquiries', 'write'),
    validate(loanIDParamSchema, 'params'),
    deleteLoan
);

module.exports = router;
