const { db } = require('../utils/dbs');
const { Client: esClient } = require('@elastic/elasticsearch');

/**
 * Returns the shared native MongoDB Db instance from dbs.js.
 * All modules (realestate, realestate-admin, admin-auth) share one MongoClient.
 * @returns {import('mongodb').Db}
 */
const connectToDatabase = () => {
    let connection = db.get();
    if (!connection) {
        db.connectToDatabase(process.env.MONGO_IP);
        connection = db.get();
    }
    return connection;
};

const esConnect = () => new esClient({ node: process.env.ELASTIC_SEARCH_IP });

const getMany = async (collection, query, projection, sort, skip, limit) => {
    skip = skip ? parseInt(skip) : 0;
    projection = projection || {};
    sort = sort || {};
    limit = limit ? parseInt(limit) : 10000;
    return collection.find(query, { projection, sort, skip, limit }).toArray();
};

exports.connectToDatabase = connectToDatabase;
exports.getMany = getMany;
exports.esConnect = esConnect;
