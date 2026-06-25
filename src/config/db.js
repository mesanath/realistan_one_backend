'use strict';
const { db } = require('../utils/dbs');
const logger = require('../utils/logger');

const connectDB = () => {
    const uri = process.env.NODE_ENV === 'local'
        ? (process.env.MONGO_IP_LOCAL || process.env.MONGO_IP)
        : process.env.MONGO_IP;
    db.connectToDatabase(uri);
    logger.info('MongoDB (native) connecting...');
};

module.exports = { connectDB };
