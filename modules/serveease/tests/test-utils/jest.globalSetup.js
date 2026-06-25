const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.OTP_DEV_MODE = 'true';
  process.env.REDIS_URL = '';          // redisClient mock handles this
  global.__MONGOD__ = mongod;
};
