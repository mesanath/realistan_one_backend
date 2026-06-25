'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/property.controller');
const { authenticate } = require('../../../src/middleware/realestate-auth.middleware');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

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

module.exports = router;
