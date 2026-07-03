'use strict';

const express = require('express');
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const { getDashboardStats } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/stats', authenticate, requireAccess('User', 'read'), getDashboardStats);

module.exports = router;
