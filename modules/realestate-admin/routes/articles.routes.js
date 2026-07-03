'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getArticlesList, getArticleDetails, addArticle, editArticle, deleteArticle } = require('../controllers/articles.controller');
const { addArticleSchema, editArticleSchema, articleIDParamSchema } = require('../validators/articles.validator');

router.get(
    '/',
    authenticate,
    requireAccess('Articles', 'read'),
    getArticlesList
);

router.get(
    '/:articleID',
    authenticate,
    requireAccess('Articles', 'read'),
    validate(articleIDParamSchema, 'params'),
    getArticleDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(addArticleSchema),
    addArticle
);

router.put(
    '/:articleID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(articleIDParamSchema, 'params'),
    validate(editArticleSchema),
    editArticle
);

router.delete(
    '/:articleID',
    authenticate,
    requireAccess('Articles', 'write'),
    validate(articleIDParamSchema, 'params'),
    deleteArticle
);

module.exports = router;
