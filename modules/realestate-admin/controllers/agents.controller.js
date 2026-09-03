'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

// Real-estate agents/brokers shown in the admin "Agents" list — distinct from
// ServeEase's home-service agents (modules/serveease), which live in their own
// Mongoose model and admin surface entirely. Named 'realEstateAgents' (not
// 'agents') deliberately — the native Mongo 'agents' collection in this
// database already holds unrelated legacy ServeEase-shaped documents from
// before that migrated to its own Mongoose model; reusing 'agents' here would
// mix this feature's data into that leftover collection.

exports.getAgentsList = async (req, res, next) => {
    try {
        const db = connectToDatabase();
        const agentsCol = db.collection('realEstateAgents');
        const data = await agentsCol.find().sort({ createdAt: -1 }).toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getAgentDetails = async (req, res, next) => {
    try {
        const { agentID } = req.params;
        const db = connectToDatabase();
        const agentsCol = db.collection('realEstateAgents');
        const data = await agentsCol.findOne({ agentID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addAgent = async (req, res, next) => {
    try {
        const args = req.body;
        const agentID = (+new Date()).toString();
        const now = new Date().valueOf();
        const db = connectToDatabase();
        const agentsCol = db.collection('realEstateAgents');
        await agentsCol.insertOne({
            agentID,
            name: args.name,
            email: args.email || '',
            phone: args.phone || '',
            city: args.city || '',
            agency: args.agency || '',
            licenseNumber: args.licenseNumber || '',
            profileImage: args.profileImage || '',
            status: args.status || 'active',
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Agent added successfully', agentID });
    } catch (e) {
        next(e);
    }
};

exports.editAgent = async (req, res, next) => {
    try {
        const { agentID } = req.params;
        const db = connectToDatabase();
        const agentsCol = db.collection('realEstateAgents');
        const existing = await agentsCol.findOne({ agentID });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.agentID;
        delete updateObj.createdAt;
        await agentsCol.updateOne({ agentID }, { $set: updateObj });
        return res.json({ success: true, message: 'Agent updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteAgent = async (req, res, next) => {
    try {
        const { agentID } = req.params;
        const db = connectToDatabase();
        const agentsCol = db.collection('realEstateAgents');
        const result = await agentsCol.deleteOne({ agentID });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }
        return res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (e) {
        next(e);
    }
};
