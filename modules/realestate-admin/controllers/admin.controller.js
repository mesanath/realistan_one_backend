'use strict';
const bcrypt = require('bcryptjs');
const { connectToDatabase, getMany } = require('../../../src/services/databaseConnections');

exports.getAdminList = async (req, res, next) => {
    try {
        const { type, userID } = req.query;
        const db = connectToDatabase();
        const newAdmin = db.collection('new_admin');
        const findQuery = type === 'edit' && userID ? { userID } : {};
        const result = await getMany(newAdmin, findQuery, {}, {});
        return res.json({ success: true, data: result || [] });
    } catch (e) {
        next(e);
    }
};

exports.addAdminUsers = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const NewAdmin = db.collection('new_admin');
        const check = await NewAdmin.findOne({ $or: [{ email: args.email }, { authername: args.authername }] });
        if (check) {
            if (check.email === args.email) {
                return res.json({ success: false, message: 'Email already exists', field: 'email' });
            }
            return res.json({ success: false, message: 'Author name already exists', field: 'authername' });
        }
        const salt = bcrypt.genSaltSync(10);
        const encryptedPassword = await bcrypt.hash(args.password, salt);
        await NewAdmin.insertOne({
            email: args.email,
            authername: args.authername,
            password: encryptedPassword,
            readAccess: args.readAccess && args.readAccess.length ? args.readAccess : [],
            writeAccess: args.writeAccess && args.writeAccess.length ? args.writeAccess : [],
            userID: (+new Date()).toString(),
        });
        return res.json({ success: true, message: 'User created successfully' });
    } catch (e) {
        next(e);
    }
};

exports.editAdminUsers = async (req, res, next) => {
    try {
        const { userID } = req.params;
        const args = { ...req.body, userID };
        const db = connectToDatabase();
        const NewAdmin = db.collection('new_admin');
        const check = await NewAdmin.findOne({
            $or: [{ email: args.email }, { authername: args.authername }],
            userID: { $ne: args.userID },
        });
        if (check) {
            if (check.email === args.email) {
                return res.json({ success: false, message: 'Email already exists', field: 'email' });
            }
            return res.json({ success: false, message: 'Author name already exists', field: 'authername' });
        }
        const updateObj = {
            email: args.email,
            authername: args.authername,
            readAccess: args.readAccess && args.readAccess.length ? args.readAccess : [],
            writeAccess: args.writeAccess && args.writeAccess.length ? args.writeAccess : [],
        };
        if (args.password) {
            const salt = bcrypt.genSaltSync(10);
            updateObj.password = await bcrypt.hash(args.password, salt);
        }
        await NewAdmin.updateOne({ userID: args.userID }, { $set: updateObj });
        return res.json({ success: true, message: 'User updated successfully' });
    } catch (e) {
        next(e);
    }
};
