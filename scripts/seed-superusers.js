'use strict';
/**
 * Seed super admin users into:
 *   1. superAdmins collection (native MongoDB) — for OTP-based admin auth
 *   2. new_admin collection (native MongoDB)   — backwards-compat for realestate-admin password login
 *   3. Mongoose User model with isAdmin:true    — for serveease admin OTP flow
 *
 * Usage:
 *   npm run seed:superusers         # seeds without wiping
 *   npm run seed:superusers -- --clean   # drops existing super admins first
 */
const dotenvConfig = process.env.DOTENV_CONFIG_PATH
    ? { path: process.env.DOTENV_CONFIG_PATH, override: true }
    : {};
require('dotenv').config(dotenvConfig);
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SUPER_ADMINS = [
    {
        email: 'admin@realistan.in',
        phone: '8884422294',
        authername: 'admin',
        readAccess: ['User', 'Articles'],
        writeAccess: ['User', 'Articles'],
    },
    {
        email: 'sanath_admin@realistan.in',
        phone: '9591972808',
        authername: 'sanath_admin',
        readAccess: ['User', 'Articles'],
        writeAccess: ['User', 'Articles'],
    },
];

const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_DEFAULT_PASSWORD || 'Admin@Realistan2025';

async function run() {
    const isClean = process.argv.includes('--clean');
    const mongoUri = process.env.MONGO_IP || 'mongodb://localhost:27017';
    const dbName = process.env.MONGO_DB || 'realistanDB';
    const mongooseUri = process.env.MONGODB_URI || `${mongoUri}/${dbName}`;

    console.log(`Connecting to MongoDB: ${mongoUri}/${dbName}`);

    // ── Native MongoDB (superAdmins + new_admin) ────────────────────────────────
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);

    const superAdminsColl = db.collection('superAdmins');
    const newAdminColl = db.collection('new_admin');

    if (isClean) {
        await superAdminsColl.deleteMany({ email: { $in: SUPER_ADMINS.map(a => a.email) } });
        await newAdminColl.deleteMany({ email: { $in: SUPER_ADMINS.map(a => a.email) } });
        console.log('Cleaned existing super admin records.');
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const now = new Date();

    for (const admin of SUPER_ADMINS) {
        const userID = String(Date.now()) + Math.floor(Math.random() * 1000);

        // superAdmins collection
        await superAdminsColl.updateOne(
            { email: admin.email },
            {
                $set: {
                    email: admin.email,
                    phone: admin.phone,
                    authername: admin.authername,
                    readAccess: admin.readAccess,
                    writeAccess: admin.writeAccess,
                    password: passwordHash,
                    userID,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );

        // new_admin collection (realestate-admin backwards compat)
        await newAdminColl.updateOne(
            { email: admin.email },
            {
                $set: {
                    email: admin.email,
                    authername: admin.authername,
                    readAccess: admin.readAccess,
                    writeAccess: admin.writeAccess,
                    password: passwordHash,
                    userID,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );

        console.log(`  [native] Upserted: ${admin.email} (phone: ${admin.phone})`);
    }

    await client.close();

    // ── Mongoose (serveease User model with isAdmin: true) ──────────────────────
    await mongoose.connect(mongooseUri);

    // Load User model (or define minimal schema inline to avoid circular deps)
    let User;
    try {
        User = require('../modules/serveease/models/User');
    } catch (e) {
        console.error('Could not load serveease User model:', e.message);
        await mongoose.disconnect();
        process.exit(1);
    }

    for (const admin of SUPER_ADMINS) {
        const normalizedPhone = `+91${admin.phone}`;
        await User.findOneAndUpdate(
            { phone: normalizedPhone },
            {
                $set: {
                    name: admin.authername,
                    email: admin.email,
                    isAdmin: true,
                    isActive: true,
                    isVerified: true,
                },
                $setOnInsert: { phone: normalizedPhone },
            },
            { upsert: true, new: true }
        );
        console.log(`  [mongoose] Upserted User: ${normalizedPhone} isAdmin=true`);
    }

    await mongoose.disconnect();
    console.log('\nSuper admin seeding complete.');
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
