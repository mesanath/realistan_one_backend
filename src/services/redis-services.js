const { redis } = require('./dbs');
const { redisDeleteByPatternAll } = require("./redis-helper");

const deleteRedis = async (listOfPatter) =>{
  try {
    if (process.env.CHECK_REDIS && process.env.CHECK_REDIS === 'true'){
      await redis.redisConnenction();
      await redisDeleteByPatternAll(listOfPatter);
      return true;
    } else {
      return true;
    }
  } catch (e) {
        throw e;
  }
};
module.exports.deleteRedis = deleteRedis;
