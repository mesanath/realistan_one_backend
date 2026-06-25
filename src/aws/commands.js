const { ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const awsS3ListObjectsCommand = (input) => new ListObjectsV2Command(input);

const awsS3GetObjectCommnad = (input) => new GetObjectCommand(input);

module.exports = {
    awsS3ListObjectsCommand,
    awsS3GetObjectCommnad,
};
