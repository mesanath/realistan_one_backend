const { S3Client } = require('@aws-sdk/client-s3');

const config = {
  region: 'ap-south-1',
};

const getAwsS3Client = () => new S3Client(config);

module.exports = { getAwsS3Client };
