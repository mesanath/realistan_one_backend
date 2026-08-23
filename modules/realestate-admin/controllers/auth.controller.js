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
            {
                userID: adminUser.userID,
                role: 'Product',
                writeAccess: adminUser.writeAccess,
                readAccess: adminUser.readAccess,
                // Carried so the same login also works against ServeEase admin
                // routes (see src/middleware/serveease-auth.middleware.js) —
                // null/undefined means this admin has no ServeEase access.
                serveeaseRole: adminUser.serveeaseRole || null,
            },
            // Sign with the same secret ServeEase's fallback token verification
            // expects (JWT_ADMIN_SECRET, falling back to JWT_SIG when unset or
            // equal) — admin-auth.middleware.js's own decodeToken() already
            // tries both, in the opposite order, so this token verifies fine on
            // both sides regardless of whether the two secrets are configured
            // the same or differently in a given environment.
            process.env.JWT_ADMIN_SECRET || process.env.JWT_SIG
        );
        return res.json({
            success: true,
            token,
            userName: adminUser.authername,
            readAccess: adminUser.readAccess,
            // The admin frontend gates action buttons (e.g. "+ Add User" on
            // /user/list) on writeAccess — it was never returned here before,
            // so those buttons never showed for anyone regardless of role.
            writeAccess: adminUser.writeAccess,
            realistanRole: adminUser.realistanRole || null,
            serveeaseRole: adminUser.serveeaseRole || null,
        });
    } catch (e) {
        next(e);
    }
};
