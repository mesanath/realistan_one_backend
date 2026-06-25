'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/article.controller');
const { apiRateLimit } = require('../../../src/middleware/rateLimit.middleware');

router.post('/homepagearticles', apiRateLimit, ctrl.getHomepageArticles);
router.post('/getarticlebyid', apiRateLimit, ctrl.getArticleById);

module.exports = router;
