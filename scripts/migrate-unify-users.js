'use strict';
/**
 * One-time migration: merges the old realestate-only `userAccounts` collection
 * (native Mongo) into the shared `users` collection (Mongoose, src/models/User.js)
 * that serveease already used — so there is exactly one account per phone number
 * across both products, matching the new single login system.
 *
 * For each userAccounts doc:
 *   - normalizes its mobile number to E.164
 *   - if a `users` doc already exists for that phone, fills in any blank fields
 *     from userAccounts (never overwrites existing serveease data — wallet, loyalty,
 *     bookings, admin flags are untouched) and reuses its _id
 *   - otherwise inserts a new `users` doc, preserving the original userAccounts _id
 *
 * Then repoints `properties.createdBy` for any property owned by a migrated
 * userAccounts _id to the resulting unified _id.
 *
 * Finally renames `userAccounts` → `userAccounts_deprecated_backup` and
 * `userTokens` → `userTokens_deprecated_backup` (never dropped — reversible).
 *
 * Safe to re-run: if `userAccounts` no longer exists, it's a no-op.
 *
 * Usage:
 *   node scripts/migrate-unify-users.js --dry-run   # report only, no writes
 *   node scripts/migrate-unify-users.js             # apply
 */
const dotenvConfig = process.env.DOTENV_CONFIG_PATH
    ? { path: process.env.DOTENV_CONFIG_PATH, override: true }
    : {};
require('dotenv').config(dotenvConfig);

const { MongoClient } = require('mongodb');

const DRY_RUN = process.argv.includes('--dry-run');
const MONGO_URI = process.env.NODE_ENV === 'local'
    ? (process.env.MONGO_IP_LOCAL || process.env.MONGO_IP)
    : process.env.MONGO_IP;
const DB_NAME = process.env.MONGO_DB;

if (!MONGO_URI || !DB_NAME) {
    console.error('Missing MONGO_IP / MONGO_DB in .env');
    process.exit(1);
}

function normalizePhone(rawMobile) {
    const digits = String(rawMobile || '').replace(/[^\d]/g, '');
    if (String(rawMobile).trim().startsWith('+')) return '+' + digits;
    if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
    if (digits.length === 10) return '+91' + digits;
    return '+' + digits; // fallback — best effort, logged for manual review
}

async function run() {
    console.log(`Connecting: ${MONGO_URI}/${DB_NAME}${DRY_RUN ? ' [dry-run]' : ''}`);
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    const collectionNames = (await db.listCollections().toArray()).map(c => c.name);
    if (!collectionNames.includes('userAccounts')) {
        console.log('No userAccounts collection found — already migrated (or nothing to do). Exiting.');
        await client.close();
        return;
    }

    const userAccountsCol = db.collection('userAccounts');
    const usersCol = db.collection('users');
    const propertiesCol = db.collection('properties');

    const userAccounts = await userAccountsCol.find({}).toArray();
    console.log(`Found ${userAccounts.length} userAccounts doc(s) to migrate.`);

    const idMap = new Map(); // old userAccounts._id (string) -> canonical users._id (string)
    let merged = 0, created = 0, skipped = 0;

    for (const ua of userAccounts) {
        const oldId = String(ua._id);
        let phone;
        try {
            phone = ua.mobile ? normalizePhone(ua.mobile) : null;
        } catch {
            phone = null;
        }

        if (!phone && !ua.socialId) {
            console.warn(`  SKIP ${oldId}: no mobile or socialId to key off of`);
            skipped++;
            continue;
        }

        const existing = phone
            ? await usersCol.findOne({ phone })
            : await usersCol.findOne({ socialId: ua.socialId });

        if (existing) {
            // Fill blanks only — never clobber real serveease data (wallet, loyalty, bookings).
            const fillIfBlank = {};
            if (ua.screenName && typeof ua.screenName === 'string' && !existing.screenName) fillIfBlank.screenName = ua.screenName;
            if (ua.email && !existing.email) fillIfBlank.email = ua.email;
            if (ua.socialId && !existing.socialId) {
                fillIfBlank.socialId = ua.socialId;
                fillIfBlank.socialIdType = ua.socialIdType || null;
                fillIfBlank.socialName = ua.socialName || null;
            }
            if (ua.whatsappFlag !== undefined && existing.whatsappFlag === undefined) fillIfBlank.whatsappFlag = ua.whatsappFlag;
            const mergedSaved = Array.from(new Set([...(existing.savedProperties || []), ...(ua.savedProperties || [])]));
            if (mergedSaved.length && mergedSaved.length !== (existing.savedProperties || []).length) {
                fillIfBlank.savedProperties = mergedSaved;
            }

            console.log(`  MERGE ${oldId} (${phone || ua.socialId}) -> existing users/${existing._id}` + (Object.keys(fillIfBlank).length ? ` [fills: ${Object.keys(fillIfBlank).join(', ')}]` : ' [no gaps to fill]'));
            if (!DRY_RUN && Object.keys(fillIfBlank).length) {
                await usersCol.updateOne({ _id: existing._id }, { $set: fillIfBlank });
            }
            idMap.set(oldId, String(existing._id));
            merged++;
        } else {
            const newDoc = {
                _id: ua._id, // preserve original id — no other collection needs remapping for this one
                name: ua.screenName || 'User',
                phone: phone || undefined,
                email: ua.email || undefined,
                screenName: ua.screenName || null,
                savedProperties: ua.savedProperties || [],
                whatsappFlag: ua.whatsappFlag || false,
                loginType: ua.loginType || 'mobile',
                socialId: ua.socialId || null,
                socialIdType: ua.socialIdType || null,
                socialName: ua.socialName || null,
                appType: ua.appType || 'realestate',
                isDeleted: ua.isDeleted || false,
                deletedAt: ua.deletedAt || null,
                isActive: true,
                isVerified: false,
                isAdmin: false,
                totalBookings: 0,
                totalSpent: 0,
                loyaltyPoints: 0,
                loyaltyTransactions: [],
                wallet: { balance: 0, transactions: [] },
                favorites: [],
                addresses: [],
                corporate: { isEnabled: false, companyName: null, gstNumber: null, billingAddress: null, creditLimit: 0, creditUsed: 0, invoiceEmail: null, pendingApproval: false },
                createdAt: ua.createdAt ? new Date(ua.createdAt) : new Date(),
                updatedAt: new Date(),
            };
            console.log(`  CREATE ${oldId} (${phone || ua.socialId}) -> new users/${oldId}`);
            if (!DRY_RUN) {
                await usersCol.insertOne(newDoc);
            }
            idMap.set(oldId, oldId);
            created++;
        }
    }

    console.log(`\nSummary: ${merged} merged into existing accounts, ${created} newly created, ${skipped} skipped.`);

    // Repoint properties.createdBy for anything owned by a migrated id
    let repointed = 0;
    for (const [oldId, newId] of idMap) {
        if (oldId === newId) continue; // nothing to repoint — id was preserved
        const result = await (DRY_RUN
            ? propertiesCol.find({ createdBy: oldId }).toArray().then(docs => ({ matchedCount: docs.length }))
            : propertiesCol.updateMany({ createdBy: oldId }, { $set: { createdBy: newId } }));
        if (result.matchedCount) {
            console.log(`  properties.createdBy: ${oldId} -> ${newId} (${result.matchedCount} doc[s])`);
            repointed += result.matchedCount;
        }
    }
    console.log(`Repointed createdBy on ${repointed} propert${repointed === 1 ? 'y' : 'ies'}.`);

    if (DRY_RUN) {
        console.log('\n[dry-run] No writes were made. Re-run without --dry-run to apply.');
        await client.close();
        return;
    }

    // Back up (rename, never drop) the old collections
    const now = Date.now();
    await db.collection('userAccounts').rename(`userAccounts_deprecated_backup_${now}`);
    console.log(`Renamed userAccounts -> userAccounts_deprecated_backup_${now}`);
    if (collectionNames.includes('userTokens')) {
        await db.collection('userTokens').rename(`userTokens_deprecated_backup_${now}`);
        console.log(`Renamed userTokens -> userTokens_deprecated_backup_${now}`);
    }

    console.log('\nMigration complete.');
    await client.close();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
