'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

const stringToSlug = (str) => {
    str = str.replace(/^\s+|\s+$/g, '').toLowerCase();
    const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
    const to   = 'aaaaeeeeiiiioooouuuunc------';
    for (let i = 0; i < from.length; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
};

exports.addProperty = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const propertiesDB = db.collection('temp');
        const currentTimestamp = +new Date();
        const now = new Date().toLocaleDateString().split('/').join('');
        const propertyID = `${stringToSlug(args.title)}-${stringToSlug(args.listingType)}-${stringToSlug(args.houseType)}-${stringToSlug(args.location)}-postalcode-${stringToSlug(args.postalCode)}-${now}-${currentTimestamp}`;
        await propertiesDB.insertOne({ ...args, propertyID, createAt: new Date().valueOf() });
        return res.json({ success: true, message: 'Inserted successfully', propertyID });
    } catch (e) {
        next(e);
    }
};

exports.editProperty = async (req, res, next) => {
    try {
        const { propertyID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.propertyID;
        const db = connectToDatabase();
        const propertiesDB = db.collection('temp');
        await propertiesDB.updateOne({ propertyID }, { $set: updateObj });
        return res.json({ success: true, message: 'Updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.getPropetiesList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const propertiesDB = db.collection('temp');
        const data = await propertiesDB.find().toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getPropetiesDetails = async (req, res, next) => {
    try {
        const { propertyID } = req.params;
        const db = connectToDatabase();
        const propertiesDB = db.collection('temp');
        const data = await propertiesDB.findOne({ propertyID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.deleteProperty = async (req, res, next) => {
    try {
        const { propertyID } = req.params;
        const db = connectToDatabase();
        const propertiesDB = db.collection('temp');
        const result = await propertiesDB.deleteOne({ propertyID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        return res.json({ success: true, message: 'Property deleted successfully' });
    } catch (e) { next(e); }
};
