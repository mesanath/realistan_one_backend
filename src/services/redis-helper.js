const { redis } = require('./dbs');
const { EXPIRED } = require('../../constants/redis-constants');
const _ = require('underscore');

/**keys , gets redis all keys : "featurematch:*"    */
const redisKeys = async (pattern) => {
    return await redis.redisCli().keys(pattern);
};


/**get , gets redis single key name:featurematch     */
const redisGetBykeyName = async (name) =>{
    return await redis.redisCli().get(name);
};



/** set , set will add new key and its stringify data */
/** key:"featurematch:matchID"  value: JSON.stringify([{ name: 'mathch3' }]) */
const redisSetByKeyName = async (name, data) => {
    return await redis.redisCli().set(name, data, "EX", EXPIRED);
};

/** delete key:featurematch    */
const redisDeleteByKeyName = async (name) => {
    return await redis.redisCli().del(name);
};


/** deletes all the realted keys :"featurematch:*"     */
const redisDeleteByPattern = async (key) => {
    let data = await redisKeys(key);
    let deleteAll = data.map(item => redisDeleteByKeyName(item));
    Promise.all(deleteAll);
    return `deleted keys:${key}`;
};

const redisDeleteByPatternAll = async(keysArray) => {
  try {
      console.log('keysArray--->', keysArray);
      if (keysArray && keysArray.length){
          let Keys_all = await  Promise.all(keysArray.map(async (item) => { return await redisKeys(item); }));
          Keys_all = _.flatten(Keys_all);
          if (_.isUndefined(Keys_all) ||  _.isEmpty(Keys_all)){
            return true;
          }
          Keys_all = await  Promise.all(Keys_all.map(async (item) => { return await redisDeleteByKeyName(item);}));
      } else {
        return true;
      }

  } catch (e) {
    console.error(e)
  }
};

module.exports = { redisKeys, redisGetBykeyName, redisSetByKeyName, redisDeleteByKeyName, redisDeleteByPattern , redisDeleteByPatternAll};
