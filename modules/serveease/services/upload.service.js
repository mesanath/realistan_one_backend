const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const logger = require('../utils/logger');

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';

let s3;
function getS3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Upload a file buffer to S3 and return its public URL.
 *
 * @param {Buffer} fileBuffer  - raw file data
 * @param {string} mimeType    - e.g. 'image/jpeg'
 * @param {string} folder      - S3 key prefix, e.g. 'job-photos/abc123/before'
 * @returns {Promise<string>}  - public HTTPS URL of the uploaded object
 */
async function uploadToS3(fileBuffer, mimeType, folder) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Dev / CI: S3 not configured — return a placeholder URL and warn
  if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_aws_access_key') {
    const placeholder = `https://placeholder.serveease.dev/${folder}/${Date.now()}-mock${EXT_MAP[mimeType] || '.jpg'}`;
    logger.warn(`[UPLOAD] S3 not configured — returning placeholder URL: ${placeholder}`);
    return placeholder;
  }

  const ext = EXT_MAP[mimeType] || '.jpg';
  const uniquePart = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const key = `${folder}/${uniquePart}${ext}`;

  await getS3Client().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  logger.info(`[UPLOAD] Uploaded to S3: ${key}`);
  return url;
}

module.exports = { uploadToS3 };
