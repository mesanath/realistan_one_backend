'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getLoansList, getLoanDetails, addLoan, editLoan, deleteLoan } = require('../controllers/loans.controller');
const { addLoanSchema, editLoanSchema, loanIDParamSchema } = require('../validators/loans.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getLoansList
);

router.get(
    '/:loanID',
    authenticate,
    requireAccess('User', 'read'),
    validate(loanIDParamSchema, 'params'),
    getLoanDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('User', 'write'),
    validate(addLoanSchema),
    addLoan
);

router.put(
    '/:loanID',
    authenticate,
    requireAccess('User', 'write'),
    validate(loanIDParamSchema, 'params'),
    validate(editLoanSchema),
    editLoan
);

router.delete(
    '/:loanID',
    authenticate,
    requireAccess('User', 'write'),
    validate(loanIDParamSchema, 'params'),
    deleteLoan
);

module.exports = router;
