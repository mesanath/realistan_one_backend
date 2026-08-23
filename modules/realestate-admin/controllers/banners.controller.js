'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

// Normalizes a stored banner doc for the admin panel. Older/malformed docs (from
// before the create endpoint's schema matched the admin form) may still carry the
// previous field names (`image`, `link`, `position`) — fall back to those so
// nothing that was already saved silently disappears from the list.
const normalizeBanner = (doc) => ({
    ...doc,
    imageUrl: doc.imageUrl || doc.image || '',
    ctaLink: doc.ctaLink || doc.link || '',
    bannerType: doc.bannerType || doc.position || '',
    isActive: typeof doc.isActive === 'boolean' ? doc.isActive : true,
});

// Same idea for feature/image banners — older docs may carry `url`/`label`.
const normalizeBannerImage = (doc) => ({
    ...doc,
    imageUrl: doc.imageUrl || doc.url || '',
    title: doc.title || doc.label || '',
    isActive: typeof doc.isActive === 'boolean' ? doc.isActive : true,
});

// ─── Banners ─────────────────────────────────────────────────────────────────

exports.getBannersList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        const data = await bannersDB.find().sort({ createdAt: -1 }).toArray();
        return res.json({ success: true, data: data.map(normalizeBanner) });
    } catch (e) {
        next(e);
    }
};

exports.getBannerDetails = async (req, res, next) => {
    try {
        const { bannerID } = req.params;
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        const data = await bannersDB.findOne({ bannerID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        return res.json({ success: true, data: normalizeBanner(data) });
    } catch (e) {
        next(e);
    }
};

exports.addBanner = async (req, res, next) => {
    try {
        const { title, imageUrl, subtitle, description, ctaText, ctaLink, bannerType, isActive } = req.body;
        const bannerID = (+new Date()).toString();
        const now = new Date().valueOf();
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        await bannersDB.insertOne({
            bannerID,
            title,
            imageUrl,
            subtitle: subtitle || '',
            description: description || '',
            ctaText: ctaText || '',
            ctaLink: ctaLink || '',
            bannerType: bannerType || '',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Banner added successfully', bannerID });
    } catch (e) {
        next(e);
    }
};

exports.editBanner = async (req, res, next) => {
    try {
        const { bannerID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.bannerID;
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        const result = await bannersDB.updateOne({ bannerID }, { $set: updateObj });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        return res.json({ success: true, message: 'Banner updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteBanner = async (req, res, next) => {
    try {
        const { bannerID } = req.params;
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        const result = await bannersDB.deleteOne({ bannerID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        return res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (e) {
        next(e);
    }
};

// ─── Banner Images (feature banners shown on the client home page) ───────────

exports.getBannerImages = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        const data = await bannerImagesDB.find().sort({ createdAt: -1 }).toArray();
        return res.json({ success: true, data: data.map(normalizeBannerImage) });
    } catch (e) {
        next(e);
    }
};

exports.addBannerImage = async (req, res, next) => {
    try {
        const { title, placement, imageUrl, link, isActive } = req.body;
        const imageID = (+new Date()).toString();
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        await bannerImagesDB.insertOne({
            imageID,
            title: title || '',
            placement,
            imageUrl,
            link: link || '',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            createdAt: new Date().valueOf(),
        });
        return res.json({ success: true, message: 'Banner image added successfully', imageID });
    } catch (e) {
        next(e);
    }
};

exports.editBannerImage = async (req, res, next) => {
    try {
        const { imageID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.imageID;
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        const result = await bannerImagesDB.updateOne({ imageID }, { $set: updateObj });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Banner image not found' });
        }
        return res.json({ success: true, message: 'Banner image updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteBannerImage = async (req, res, next) => {
    try {
        const { imageID } = req.params;
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        const result = await bannerImagesDB.deleteOne({ imageID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Banner image not found' });
        }
        return res.json({ success: true, message: 'Banner image deleted successfully' });
    } catch (e) {
        next(e);
    }
};
