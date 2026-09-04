'use strict';
const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/property.controller');
const verificationCtrl = require('../controllers/propertyVerification.controller');
const { authenticate } = require('../../../src/middleware/realestate-auth.middleware');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

// Memory storage, images + PDFs, max 10 MB — verification documents (title deed, encumbrance
// certificate, etc.) are larger/denser than the job-photo uploads this limit is modeled on
// (modules/serveease/routes/booking.routes.js's photoUpload, 5 MB image-only).
const verificationUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP images and PDF files are allowed'), false);
        }
    },
});

router.get('/trending', apiRateLimit, ctrl.getTrending);
router.post('/getproperties', apiRateLimit, ctrl.getProperties);
router.post('/homepageproperties', apiRateLimit, ctrl.getHomepageProperties);
router.post('/getpropertybyid', apiRateLimit, ctrl.getPropertyById);
router.post('/getrelatedproperties', apiRateLimit, ctrl.getRelatedProperties);
router.post('/searchfunc', apiRateLimit, ctrl.searchProperties);
router.post('/addproperties', authenticate, ctrl.addProperty);
router.post('/updateproperty', authenticate, ctrl.updateProperty);
router.get('/myproperties', authenticate, ctrl.getMyProperties);
router.post('/shortlist', authenticate, ctrl.toggleShortlist);
router.get('/shortlisted', authenticate, ctrl.getShortlisted);
router.post('/deleteproperty', authenticate, ctrl.deleteProperty);

router.post('/verification/upload', authenticate, verificationUpload.single('file'), verificationCtrl.uploadVerificationDocument);
router.post('/verification/status', authenticate, verificationCtrl.getVerificationStatus);

module.exports = router;
