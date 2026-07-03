'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.getProfilesList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const profiles = db.collection('profiles');
        const data = await profiles.find().toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getProfileDetails = async (req, res, next) => {
    try {
        const { profileID } = req.params;
        const db = connectToDatabase();
        const profiles = db.collection('profiles');
        const data = await profiles.findOne({ profileID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addProfile = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const profiles = db.collection('profiles');
        const now = new Date().valueOf();
        const profileID = (+new Date()).toString();
        await profiles.insertOne({
            profileID,
            name: args.name,
            email: args.email || '',
            phone: args.phone || '',
            city: args.city || '',
            bio: args.bio || '',
            profileImage: args.profileImage || '',
            role: args.role || '',
            isActive: args.isActive !== undefined ? args.isActive : true,
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Profile added successfully', profileID });
    } catch (e) {
        next(e);
    }
};

exports.editProfile = async (req, res, next) => {
    try {
        const { profileID } = req.params;
        const db = connectToDatabase();
        const profiles = db.collection('profiles');
        const existing = await profiles.findOne({ profileID });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.profileID;
        delete updateObj.createdAt;
        await profiles.updateOne({ profileID }, { $set: updateObj });
        return res.json({ success: true, message: 'Profile updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteProfile = async (req, res, next) => {
    try {
        const { profileID } = req.params;
        const db = connectToDatabase();
        const profiles = db.collection('profiles');
        const existing = await profiles.findOne({ profileID });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        await profiles.deleteOne({ profileID });
        return res.json({ success: true, message: 'Profile deleted successfully' });
    } catch (e) {
        next(e);
    }
};
