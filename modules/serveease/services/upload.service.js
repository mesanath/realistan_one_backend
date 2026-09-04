// Re-exports the shared S3 upload implementation (see src/services/s3Upload.service.js for the
// full implementation and history). Kept as a thin re-export, not deleted, so the existing
// caller (booking.controller.js: `require('../services/upload.service')`) needs no changes.
const { uploadToS3 } = require('../../../src/services/s3Upload.service');

module.exports = { uploadToS3 };
