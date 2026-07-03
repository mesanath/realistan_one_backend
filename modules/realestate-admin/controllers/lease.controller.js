'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.getLeaseList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const leaseCol = db.collection('lease');
        const data = await leaseCol.find().toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getLeaseDetails = async (req, res, next) => {
    try {
        const { leaseID } = req.params;
        const db = connectToDatabase();
        const leaseCol = db.collection('lease');
        const data = await leaseCol.findOne({ leaseID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Lease not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addLease = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const leaseCol = db.collection('lease');
        const leaseID = (+new Date()).toString();
        const now = new Date().valueOf();
        await leaseCol.insertOne({
            ...args,
            leaseID,
            status: args.status || 'available',
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Lease added successfully', leaseID });
    } catch (e) {
        next(e);
    }
};

exports.editLease = async (req, res, next) => {
    try {
        const { leaseID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.leaseID;
        const db = connectToDatabase();
        const leaseCol = db.collection('lease');
        await leaseCol.updateOne({ leaseID }, { $set: updateObj });
        return res.json({ success: true, message: 'Lease updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteLease = async (req, res, next) => {
    try {
        const { leaseID } = req.params;
        const db = connectToDatabase();
        const leaseCol = db.collection('lease');
        const result = await leaseCol.deleteOne({ leaseID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Lease not found' });
        }
        return res.json({ success: true, message: 'Lease deleted successfully' });
    } catch (e) {
        next(e);
    }
};
