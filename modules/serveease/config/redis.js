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
const memStore = new Map();  // string values: { value: string, expiresAt: number|null }
const setStore = new Map();  // set values:    { value: Set<string>, expiresAt: number|null }

function _expired(item) {
  return item.expiresAt !== null && Date.now() > item.expiresAt;
}

const redisGet = async (key) => {
  if (client) return client.get(key);
  const item = memStore.get(key);
  if (!item) return null;
  if (_expired(item)) { memStore.delete(key); return null; }
  return item.value;
};

const redisSet = async (key, value, ttlSeconds) => {
  if (client) return client.setEx(key, ttlSeconds, value);
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

const redisDel = async (key) => {
  if (client) return client.del(key);
  memStore.delete(key);
  setStore.delete(key);
};

const redisIncr = async (key) => {
  if (client) return client.incr(key);
  const item = memStore.get(key);
  if (item && _expired(item)) { memStore.delete(key); }
  const existing = memStore.get(key);
  const val = existing ? parseInt(existing.value) + 1 : 1;
  memStore.set(key, { value: String(val), expiresAt: existing?.expiresAt ?? null });
  return val;
};

// Set a TTL on an existing key (used after INCR/SADD to start the expiry window)
const redisExpire = async (key, ttlSeconds) => {
  if (client) return client.expire(key, ttlSeconds);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const memItem = memStore.get(key);
  if (memItem) { memItem.expiresAt = expiresAt; return 1; }
  const setItem = setStore.get(key);
  if (setItem) { setItem.expiresAt = expiresAt; return 1; }
  return 0;
};

// Add a member to a set (used for per-IP unique-phone tracking)
const redisSadd = async (key, member) => {
  if (client) return client.sAdd(key, member);
  let item = setStore.get(key);
  if (item && _expired(item)) { setStore.delete(key); item = null; }
  if (!item) { item = { value: new Set(), expiresAt: null }; setStore.set(key, item); }
  const isNew = !item.value.has(member);
  item.value.add(member);
  return isNew ? 1 : 0;
};

// Count members in a set
const redisScard = async (key) => {
  if (client) return client.sCard(key);
  const item = setStore.get(key);
  if (!item) return 0;
  if (_expired(item)) { setStore.delete(key); return 0; }
  return item.value.size;
};

module.exports = {
  connectRedis,
  get: redisGet,
  set: redisSet,
  del: redisDel,
  incr: redisIncr,
  expire: redisExpire,
  sadd: redisSadd,
  scard: redisScard,
};
module.exports.default = connectRedis;
