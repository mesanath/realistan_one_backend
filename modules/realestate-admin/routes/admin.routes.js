'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getAdminList, addAdminUsers, editAdminUsers } = require('../controllers/admin.controller');
const { getAdminListSchema, addAdminUserSchema, editAdminUserSchema, userIDParamSchema } = require('../validators/admin.validator');

router.get(
    '/users',
    authenticate,
    requireAccess('User', 'read'),
    validate(getAdminListSchema, 'query'),
    getAdminList
);

router.post(
    '/users',
    authenticate,
    requireAccess('User', 'write'),
    validate(addAdminUserSchema),
    addAdminUsers
);

router.put(
    '/users/:userID',
    authenticate,
    requireAccess('User', 'write'),
    validate(userIDParamSchema, 'params'),
    validate(editAdminUserSchema),
    editAdminUsers
);

module.exports = router;
