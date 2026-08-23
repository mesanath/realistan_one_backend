'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');
const { BANNER_PLACEMENTS } = require('../../../constants/bannerPlacements');

// Public read of feature banners for the client home page. Only ever returns
// active banners and only the fields the site needs to render them — no admin
// metadata (createdAt/imageID internals aside from what's needed to key a list).
exports.getFeatureBanners = async (req, res, next) => {
    try {
        const { placement } = req.query;
        if (placement && !BANNER_PLACEMENTS.includes(placement)) {
            return res.status(400).json({
                success: false,
                message: `placement must be one of: ${BANNER_PLACEMENTS.join(', ')}`,
            });
        }

        const query = { isActive: { $ne: false } };
        if (placement) query.placement = placement;

        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        const data = await bannerImagesDB
            .find(query)
            .sort({ createdAt: -1 })
            .project({ imageID: 1, title: 1, placement: 1, imageUrl: 1, link: 1, _id: 0 })
            .toArray();

        // Normalize legacy field names the same way the admin list does, so a
        // banner saved before this endpoint existed still renders.
        const banners = data.map(b => ({
            imageID: b.imageID,
            title: b.title || '',
            placement: b.placement,
            imageUrl: b.imageUrl || b.url || '',
            link: b.link || '',
        }));

        return res.json({ success: true, data: banners });
    } catch (e) {
        next(e);
    }
};
