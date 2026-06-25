const Csv = require('csvtojson');
const { getAwsS3Client } = require('../aws/clients');
const { awsS3GetObjectCommnad, awsS3ListObjectsCommand } = require('../aws/commands');

const s3 = getAwsS3Client();
/**
 *
 * @param {('getObject'|'listObjectsV2')} method
 * @param {*} params
 * @param {*} type
 * @returns
 */
const awsfun = async (method, params, type) => {
  type = typeof type != 'undefined' ? type : s3;
  let command;
  switch (method) {
    case 'getObject':
      command = awsS3GetObjectCommnad(params);
      break;
    case 'listObjectsV2':
      command = awsS3ListObjectsCommand(params);
      break;
  }
  return type.send(command);
};
const s3Stream = async (params) => {
  const s3Object = await awsfun('getObject', params);
  const s3Stream = s3Object.Body;
  if (s3Stream){
    const json = await Csv().fromStream(s3Stream);
    return json ? json : []
  } else {
    return []
  }
};
module.exports.awsfun = awsfun;
module.exports.s3Stream = s3Stream;
