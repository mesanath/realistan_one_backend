'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getAdminList, addAdminUsers, editAdminUsers, deleteAdminUser } = require('../controllers/admin.controller');
const { getAdminListSchema, addAdminUserSchema, editAdminUserSchema, userIDParamSchema } = require('../validators/admin.validator');

router.get(
    '/users',
    authenticate,
    requireAccess('User', 'read'),
    validate(getAdminListSchema, 'query'),
    getAdminList
);

// Creating, editing, and deleting admin console users is gated on the
// dedicated 'AdminConsoleUsers' level, granted only to the 'admin' role —
// this is the one action 'operations' explicitly does not get (see
// constants/adminRoles.js). Listing (GET above) stays on the broader 'User'
// read level since only *creating* admin console users is meant to be
// admin-only, not viewing who exists.
router.post(
    '/users',
    authenticate,
    requireAccess('AdminConsoleUsers', 'write'),
    validate(addAdminUserSchema),
    addAdminUsers
);

router.put(
    '/users/:userID',
    authenticate,
    requireAccess('AdminConsoleUsers', 'write'),
    validate(userIDParamSchema, 'params'),
    validate(editAdminUserSchema),
    editAdminUsers
);

router.delete(
    '/users/:userID',
    authenticate,
    requireAccess('AdminConsoleUsers', 'write'),
    validate(userIDParamSchema, 'params'),
    deleteAdminUser
);

module.exports = router;
