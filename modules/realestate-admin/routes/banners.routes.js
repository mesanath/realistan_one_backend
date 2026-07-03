'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const {
    getBannersList,
    getBannerDetails,
    addBanner,
    editBanner,
    deleteBanner,
    getBannerImages,
    addBannerImage,
    deleteBannerImage,
} = require('../controllers/banners.controller');
const {
    addBannerSchema,
    editBannerSchema,
    bannerIDParamSchema,
    addBannerImageSchema,
    imageIDParamSchema,
} = require('../validators/banners.validator');

// ─── Banner Images ────────────────────────────────────────────────────────────

router.get(
    '/images',
    authenticate,
    requireAccess('Articles', 'read'),
    getBannerImages
);

router.post(
    '/images',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addBannerImageSchema),
    addBannerImage
);

router.delete(
    '/images/:imageID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(imageIDParamSchema, 'params'),
    deleteBannerImage
);

// ─── Banners ─────────────────────────────────────────────────────────────────

router.get(
    '/',
    authenticate,
    requireAccess('Articles', 'read'),
    getBannersList
);

router.get(
    '/:bannerID',
    authenticate,
    requireAccess('Articles', 'read'),
    validate(bannerIDParamSchema, 'params'),
    getBannerDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addBannerSchema),
    addBanner
);

router.put(
    '/:bannerID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(bannerIDParamSchema, 'params'),
    validate(editBannerSchema),
    editBanner
);

router.delete(
    '/:bannerID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(bannerIDParamSchema, 'params'),
    deleteBanner
);

module.exports = router;
