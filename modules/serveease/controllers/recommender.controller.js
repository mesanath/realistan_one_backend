const recommenderService = require('../services/recommender.service');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * GET /api/v1/recommendations
 *
 * Returns up to 3 AI-recommended services for the authenticated customer.
 * Requires customer role (enforced by route middleware).
 * Query params:
 *   city (string) — city name for pricing/context; falls back to user's stored city
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const city = req.query.city || req.user.city || 'Bangalore';

    const recommendations = await recommenderService.getRecommendations(userId, city, redis);

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (err) {
    // Never let a recommender failure bubble into a 500 — return empty gracefully
    logger.warn(`[recommender controller] Error: ${err.message}`);
    res.json({ success: true, count: 0, data: [] });
  }
};
