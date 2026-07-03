'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

// ─── Banners ─────────────────────────────────────────────────────────────────

exports.getBannersList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        const data = await bannersDB.find().toArray();
        return res.json({ success: true, data });
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
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addBanner = async (req, res, next) => {
    try {
        const { title, image, link, position, isActive } = req.body;
        const bannerID = (+new Date()).toString();
        const now = new Date().valueOf();
        const db = connectToDatabase();
        const bannersDB = db.collection('banners');
        await bannersDB.insertOne({
            bannerID,
            title,
            image,
            link: link || null,
            position: position || null,
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

// ─── Banner Images ────────────────────────────────────────────────────────────

exports.getBannerImages = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        const data = await bannerImagesDB.find().toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addBannerImage = async (req, res, next) => {
    try {
        const { url, label, bannerID } = req.body;
        const imageID = (+new Date()).toString();
        const db = connectToDatabase();
        const bannerImagesDB = db.collection('bannerImages');
        await bannerImagesDB.insertOne({
            imageID,
            url,
            label: label || null,
            bannerID: bannerID || null,
            createdAt: new Date().valueOf(),
        });
        return res.json({ success: true, message: 'Banner image added successfully', imageID });
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
