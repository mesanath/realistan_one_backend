const { getBundleSuggestions, getFeaturedBundleDeals } = require('../services/bundle.service');

/**
 * GET /api/v1/services/:id/bundles
 * Public — no auth required.
 * Returns bundle suggestions for the given service.
 */
async function getBundleSuggestionsHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[a-f\d]{24}$/i)) {
      // Not a MongoDB ObjectId — return empty (handles numeric mock IDs)
      return res.json({ success: true, data: [] });
    }

    const suggestions = await getBundleSuggestions(id);

    // Shape the response: include discounted price alongside original
    const result = suggestions.map(({ service, discountPercent, bundleLabel }) => {
      const originalPrice = service.basePrice;
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
      return {
        _id: service._id,
        name: service.name,
        slug: service.slug,
        emoji: service.emoji || null,
        category: service.categoryId?.name || null,
        basePrice: originalPrice,
        discountedPrice,
        discountPercent,
        bundleLabel,
        durationMinutes: service.durationMinutes,
        rating: service.rating,
        ratingCount: service.ratingCount,
        isActive: service.isActive,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/services/bundles/featured
 * Public — no auth required. Home-page "buy these together" combo deals, no anchor service needed.
 */
async function getFeaturedBundlesHandler(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 10);
    const deals = await getFeaturedBundleDeals(limit);
    res.json({ success: true, data: deals });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBundleSuggestionsHandler, getFeaturedBundlesHandler };
