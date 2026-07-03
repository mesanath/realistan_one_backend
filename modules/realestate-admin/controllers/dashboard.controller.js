'use strict';

const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.getDashboardStats = async (_req, res, next) => {
  try {
    const db = connectToDatabase();

    const [
      properties,
      articles,
      admins,
      banners,
      profiles,
      lease,
      loans,
      pincodes,
    ] = await Promise.all([
      db.collection('temp').countDocuments(),
      db.collection('articles').countDocuments(),
      db.collection('new_admin').countDocuments(),
      db.collection('banners').countDocuments(),
      db.collection('profiles').countDocuments(),
      db.collection('lease').countDocuments(),
      db.collection('loans').countDocuments(),
      db.collection('pincodes').countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        properties,
        articles,
        admins,
        banners,
        profiles,
        lease,
        loans,
        pincodes,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    next(e);
  }
};
