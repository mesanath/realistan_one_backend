'use strict';
const logger = require('../utils/logger');

// Registers every job definition on the shared Agenda instance. Call this once, before
// agenda.start() (see src/jobs/agenda.js's startAgenda). Feature-specific jobs (search-index
// sync, etc.) get added here as their own require()'d module — kept as one file per job so this
// registry file stays a plain list of registrations, not growing job logic itself.
module.exports = function registerJobs(_agenda) {
  // No jobs defined yet — this file is the registration point for Feature 2's reindex-property /
  // reindex-service jobs and beyond (they'll call _agenda.define(...) here). Left intentionally
  // empty rather than adding a placeholder job just to have one; agenda.start() with zero
  // definitions is a normal, valid state.
  logger.info('[agenda] job registry loaded (0 jobs defined)');
};
