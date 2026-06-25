'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.login = async (req, res, next) => {
    try {
        const { userName, password } = req.body;
        const db = connectToDatabase();
        const NewAdmin = db.collection('new_admin');
        const adminUser = await NewAdmin.findOne({ email: userName });
        if (!adminUser) {
            return res.status(401).json({ success: false, message: 'No user found' });
        }
        const match = await bcrypt.compare(password, adminUser.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Password does not match' });
        }
        const token = jwt.sign(
            { userID: adminUser.userID, role: 'Product', writeAccess: adminUser.writeAccess, readAccess: adminUser.readAccess },
            process.env.JWT_SIG
        );
        return res.json({ success: true, token, userName: adminUser.authername, readAccess: adminUser.readAccess });
    } catch (e) {
        next(e);
    }
};
