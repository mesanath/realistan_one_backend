'use strict';
const router = require('express').Router();
const { login } = require('../controllers/auth.controller');
const validate = require('../../../src/middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');

router.post('/login', validate(loginSchema), login);

module.exports = router;
