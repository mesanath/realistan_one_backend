const { redis } = require('./dbs');
const { redisDeleteByPatternAll } = require("./redis-helper");

const deleteRedis = async (listOfPatter) => {
  if (process.env.CHECK_REDIS && process.env.CHECK_REDIS === 'true') {
    await redis.redisConnenction();
    await redisDeleteByPatternAll(listOfPatter);
  }
  return true;
};
module.exports.deleteRedis = deleteRedis;
