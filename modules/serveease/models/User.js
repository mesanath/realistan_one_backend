'use strict';
// Moved to src/models/User.js — it's the shared identity for both realestate and
// serveease now, not serveease-specific. Re-exported here so every existing
// `require('../models/User')` / `require('./User')` in this module keeps working.
module.exports = require('../../../src/models/User');
