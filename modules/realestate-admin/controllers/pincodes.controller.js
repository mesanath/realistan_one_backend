'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.getPincodesList = async (req, res, next) => {
    try {
        const { city, state } = req.query;
        const query = {};
        if (city) query.city = city;
        if (state) query.state = state;
        const db = connectToDatabase();
        const col = db.collection('pincodes');
        const data = await col.find(query).toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getPincodeDetails = async (req, res, next) => {
    try {
        const { pincodeID } = req.params;
        const db = connectToDatabase();
        const col = db.collection('pincodes');
        const data = await col.findOne({ pincodeID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addPincode = async (req, res, next) => {
    try {
        const { pincode, area, city, state, country, isActive } = req.body;
        const pincodeID = (+new Date()).toString();
        const now = new Date();
        const doc = {
            pincodeID,
            pincode,
            area,
            city,
            state,
            country: country !== undefined ? country : 'India',
            isActive: isActive !== undefined ? isActive : true,
            createdAt: now,
            updatedAt: now,
        };
        const db = connectToDatabase();
        const col = db.collection('pincodes');
        await col.insertOne(doc);
        return res.json({ success: true, message: 'Pincode added successfully', pincodeID });
    } catch (e) {
        next(e);
    }
};

exports.editPincode = async (req, res, next) => {
    try {
        const { pincodeID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date() };
        delete updateObj.pincodeID;
        const db = connectToDatabase();
        const col = db.collection('pincodes');
        const result = await col.updateOne({ pincodeID }, { $set: updateObj });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }
        return res.json({ success: true, message: 'Pincode updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deletePincode = async (req, res, next) => {
    try {
        const { pincodeID } = req.params;
        const db = connectToDatabase();
        const col = db.collection('pincodes');
        const result = await col.deleteOne({ pincodeID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }
        return res.json({ success: true, message: 'Pincode deleted successfully' });
    } catch (e) {
        next(e);
    }
};
