'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getProfilesList, getProfileDetails, addProfile, editProfile, deleteProfile } = require('../controllers/profiles.controller');
const { addProfileSchema, editProfileSchema, profileIDParamSchema } = require('../validators/profiles.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getProfilesList
);

router.get(
    '/:profileID',
    authenticate,
    requireAccess('User', 'read'),
    validate(profileIDParamSchema, 'params'),
    getProfileDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('User', 'write'),
    validate(addProfileSchema),
    addProfile
);

router.put(
    '/:profileID',
    authenticate,
    requireAccess('User', 'write'),
    validate(profileIDParamSchema, 'params'),
    validate(editProfileSchema),
    editProfile
);

router.delete(
    '/:profileID',
    authenticate,
    requireAccess('User', 'write'),
    validate(profileIDParamSchema, 'params'),
    deleteProfile
);

module.exports = router;
