const { createClient } = require('redis');
const logger = require('../../../src/utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    client.on('ready', () => logger.info('✅ Redis connected'));
    await client.connect();
  } catch (err) {
    logger.warn(`⚠️  Redis unavailable — OTP will use in-memory fallback: ${err.message}`);
    client = null;
  }
};

// In-memory fallback when Redis is unavailable (dev only)
const memStore = new Map();

const redisGet = async (key) => {
  if (client) return client.get(key);
  const item = memStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) { memStore.delete(key); return null; }
  return item.value;
};

const redisSet = async (key, value, ttlSeconds) => {
  if (client) return client.setEx(key, ttlSeconds, value);
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

const redisDel = async (key) => {
  if (client) return client.del(key);
  memStore.delete(key);
};

const redisIncr = async (key) => {
  if (client) return client.incr(key);
  const item = memStore.get(key);
  const val = item ? parseInt(item.value) + 1 : 1;
  memStore.set(key, { value: String(val), expiresAt: item?.expiresAt });
  return val;
};

module.exports = { connectRedis: connectRedis, get: redisGet, set: redisSet, del: redisDel, incr: redisIncr };
module.exports.default = connectRedis;
