'use strict';
const Agenda = require('agenda');
const logger = require('../utils/logger');

// Single MongoDB-backed job queue, shared by every background job in the app (property/service
// search-index sync today, more as Feature 2/3 land). Deliberately not Redis-backed (BullMQ) —
// see strategic-roadmap.md's Elasticsearch-over-new-vector-DB reasoning, same logic applies here:
// MongoDB is already the dominant, well-integrated datastore, so a Mongo-backed queue (Agenda)
// adds zero new infrastructure, whereas BullMQ would require a third Redis client library
// (ioredis) alongside the two (`redis`, `async-redis`) already in use.
let agenda = null;

const getAgenda = () => {
  if (agenda) return agenda;
  agenda = new Agenda({
    db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' },
    processEvery: '30 seconds',
    maxConcurrency: 5,
  });
  agenda.on('fail', (err, job) => {
    logger.error(`[agenda] job "${job.attrs.name}" failed: ${err.message}`);
  });
  agenda.on('success', (job) => {
    logger.info(`[agenda] job "${job.attrs.name}" completed`);
  });
  return agenda;
};

// Starts processing — call once from server.js, never from src/app.js (tests require src/app.js
// directly via supertest and must never open an Agenda/Mongo connection as a side effect of that).
//
// Also a no-op under NODE_ENV=test: realestate's own test helper (modules/realestate/tests/
// helpers/setup.js) requires the actual server.js, not just src/app.js, so this WOULD start
// running here during every realestate test otherwise. Agenda's own polling (processEvery) is
// exactly the kind of background timer that outlived a test file's teardown and corrupted an
// unrelated later test in this suite before (see otp-flow.test.js's fire-and-forget invoice
// generation, fixed by mocking it out rather than letting it run during tests) — skip it here for
// the same reason rather than risk repeating that.
const startAgenda = async () => {
  if (process.env.NODE_ENV === 'test') {
    logger.info('[agenda] skipped — NODE_ENV=test');
    return null;
  }
  const instance = getAgenda();
  require('./index')(instance); // registers job definitions before starting the processor
  await instance.start();
  logger.info('✅ Agenda job processor started');
  return instance;
};

module.exports = { getAgenda, startAgenda };
