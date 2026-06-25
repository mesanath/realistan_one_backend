const mongoose = require('mongoose');
const logger = require('../../../src/utils/logger');

async function fixPaymentIndex(db) {
  try {
    const coll = db.collection('payments');

    // Drop non-sparse index if it exists (old schema had no sparse flag)
    const indexes = await coll.indexes();
    const bad = indexes.find((i) => i.name === 'webhookEventId_1' && !i.sparse);
    if (bad) {
      await coll.dropIndex('webhookEventId_1');
      logger.info('[migration] Dropped non-sparse webhookEventId_1 index');
    }

    // Remove explicit null values — sparse index only skips absent fields, not null ones
    const result = await coll.updateMany(
      { webhookEventId: null },
      { $unset: { webhookEventId: '' } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`[migration] Unset webhookEventId:null on ${result.modifiedCount} payment doc(s)`);
    }
  } catch (e) {
    if (!e.message?.includes('index not found')) {
      logger.warn(`[migration] fixPaymentIndex: ${e.message}`);
    }
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    await fixPaymentIndex(conn.connection.db);
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

module.exports = connectDB;
module.exports.connectMongoose = connectDB;
