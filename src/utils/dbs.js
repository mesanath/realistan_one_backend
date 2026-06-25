'use strict';
const { MongoClient, ObjectId } = require('mongodb');
const { createClient } = require('async-redis');
const { Client: esClient } = require('@elastic/elasticsearch');

const state = { db: null, client: null };
const redis = { cursor: null };
const redisRead = { readcursor: null };
const elastic = { esData: null };

const connect = async (url) => {
    try {
        const dbOptions = {
            connectTimeoutMS: 3000,
        };
        if (process.env.NODE_ENV === 'local') {
            Object.assign(dbOptions, { directConnection: true });
        }
        const dbClient = new MongoClient(url, dbOptions);
        await dbClient.connect();
        state.db = dbClient.db(process.env.MONGO_DB);
        state.client = dbClient;
        return state;
    } catch (e) {
        console.error(`DB connect error: ${e.message}`);
        process.exit(1);
    }
};

const esConnect = () => {
    if (elastic.esData) return elastic;
    elastic.esData = new esClient({ node: process.env.ELASTIC_SEARCH_IP });
    return elastic;
};

const redisConnect = async () => {
    if (redis.cursor && redis.cursor.connected) return redis;
    const redisClient = await createClient(process.env.REDIS_PORT, process.env.REDIS_URL);
    redisClient.on('error', (err) => console.error('Redis error:', err));
    redis.cursor = redisClient;
    return redis;
};

const redisWriteConnect = async (port, url) => {
    if (redisRead.readcursor && redisRead.readcursor.connected) return redisRead;
    redisRead.readcursor = await createClient(port, url);
    redisRead.readcursor.on('error', (err) => console.error('Redis write error:', err));
    return redisRead;
};

function connectToDatabase(uri) {
    if (state.db) return state.db;
    const dbOptions = {};
    if (process.env.NODE_ENV === 'local') {
        Object.assign(dbOptions, { directConnection: true });
    }
    const dbClient = new MongoClient(uri || process.env.MONGO_IP, dbOptions);
    state.db = dbClient.db(process.env.MONGO_DB);
    return state.db;
}

const get = () => state.db;
const client = () => state.client;
const close = () => true;
const redisCli = () => redis.cursor;
const redisWriteCli = () => redisRead.readcursor;
const elasticServer = () => elastic.esData;

const getCollection = (name) => {
    if (!get()) connectToDatabase(process.env.MONGO_IP);
    return get().collection(name);
};

const ObjectID = (inputId) => new ObjectId(inputId);

module.exports = {
    getCollection,
    ObjectID,
    redis: { redisConnect, redisCli, redisWriteConnect, redisWriteCli },
    esConnects: { esConnect, elasticServer },
    db: { connect, get, client, close, connectToDatabase },
};
