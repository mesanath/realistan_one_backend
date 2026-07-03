'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.getLoansList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const col = db.collection('loans');
        const data = await col.find().toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getLoanDetails = async (req, res, next) => {
    try {
        const { loanID } = req.params;
        const db = connectToDatabase();
        const col = db.collection('loans');
        const data = await col.findOne({ loanID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addLoan = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const col = db.collection('loans');
        const loanID = (+new Date()).toString();
        const now = new Date();
        await col.insertOne({
            ...args,
            loanID,
            status: args.status || 'pending',
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Loan added successfully', loanID });
    } catch (e) {
        next(e);
    }
};

exports.editLoan = async (req, res, next) => {
    try {
        const { loanID } = req.params;
        const db = connectToDatabase();
        const col = db.collection('loans');
        const updateObj = { ...req.body, updatedAt: new Date() };
        delete updateObj.loanID;
        const result = await col.updateOne({ loanID }, { $set: updateObj });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        return res.json({ success: true, message: 'Loan updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteLoan = async (req, res, next) => {
    try {
        const { loanID } = req.params;
        const db = connectToDatabase();
        const col = db.collection('loans');
        const result = await col.deleteOne({ loanID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        return res.json({ success: true, message: 'Loan deleted successfully' });
    } catch (e) {
        next(e);
    }
};
