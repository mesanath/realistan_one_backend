'use strict';
/**
 * Master seed script — seeds all three modules in one run.
 *
 *   Realestate   → properties + articles collections (native MongoDB)
 *   ServeEase    → categories + services + agents + coupons (Mongoose)
 *
 * Usage:
 *   npm run seed                 # upsert — safe to re-run
 *   npm run seed:clean           # wipe seed data first, then re-seed
 *   NODE_ENV=local npm run seed  # use MONGO_IP_LOCAL for native driver
 */
const dotenvConfig = process.env.DOTENV_CONFIG_PATH
    ? { path: process.env.DOTENV_CONFIG_PATH, override: true }
    : {};
require('dotenv').config(dotenvConfig);

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const CLEAN = process.argv.includes('--clean');
const MONGO_URI = process.env.NODE_ENV === 'local'
    ? (process.env.MONGO_IP_LOCAL || process.env.MONGO_IP)
    : process.env.MONGO_IP;
const DB_NAME   = process.env.MONGO_DB;
const MONGOOSE_URI = process.env.MONGODB_URI;

if (!MONGO_URI || !DB_NAME) {
    console.error('Missing MONGO_IP / MONGO_DB in .env');
    process.exit(1);
}

// ─── Realestate seed data ─────────────────────────────────────────────────────
// Organic property/article data + real, uploaded image references live in
// modules/realestate/seeds/ — see that folder for the full listings.


const PROPERTIES = require('../modules/realestate/seeds/properties.seed');
const ARTICLES   = require('../modules/realestate/seeds/articles.seed');

// ─── Part 1: Seed realestate (native MongoDB) ─────────────────────────────────

async function seedRealestate() {
    console.log('\n── Realestate (native MongoDB) ─────────────────────────');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    const propertiesCol = db.collection('properties');
    const articlesCol   = db.collection('articles');

    if (CLEAN) {
        const seedPropertyIDs = PROPERTIES.map(p => p.propertyID);
        const seedArticleIDs  = ARTICLES.map(a => a.articleID);
        const delP = await propertiesCol.deleteMany({ propertyID: { $in: seedPropertyIDs } });
        const delA = await articlesCol.deleteMany({ articleID: { $in: seedArticleIDs } });
        console.log(`   Cleaned: ${delP.deletedCount} properties, ${delA.deletedCount} articles`);
    }

    for (const property of PROPERTIES) {
        await propertiesCol.updateOne({ propertyID: property.propertyID }, { $set: property }, { upsert: true });
    }
    for (const article of ARTICLES) {
        await articlesCol.updateOne({ articleID: article.articleID }, { $set: article }, { upsert: true });
    }

    console.log(`   Seeded: ${PROPERTIES.length} properties, ${ARTICLES.length} articles`);
    const cities = [...new Set(PROPERTIES.map(p => p.city))];
    cities.forEach(c => console.log(`     ${c}: ${PROPERTIES.filter(p => p.city === c).length} properties`));

    await client.close();
}

// ─── Part 2: Seed serveease (Mongoose) ───────────────────────────────────────

async function seedServeease() {
    if (!MONGOOSE_URI) {
        console.warn('\n   MONGODB_URI not set — skipping ServeEase seed');
        return;
    }

    console.log('\n── ServeEase (Mongoose) ────────────────────────────────');
    await mongoose.connect(MONGOOSE_URI);

    const Category = require('../modules/serveease/models/Category');
    const Service  = require('../modules/serveease/models/Service');
    const Agent    = require('../modules/serveease/models/Agent');
    const User     = require('../modules/serveease/models/User');
    const Coupon   = require('../modules/serveease/models/Coupon');
    const Booking  = require('../modules/serveease/models/Booking');
    const Review   = require('../modules/serveease/models/Review');

    const categoriesData          = require('../modules/serveease/seeds/categories.seed');
    const servicesByCategorySlug  = require('../modules/serveease/seeds/services.seed');
    const agentsData              = require('../modules/serveease/seeds/agents.seed');
    const customersData           = require('../modules/serveease/seeds/customers.seed');
    const generateBookings        = require('../modules/serveease/seeds/bookings.seed');
    const generateReviews         = require('../modules/serveease/seeds/reviews.seed');
    const { reviews: reviewPhotoPool } = require('../modules/serveease/seeds/image-assets.json');

    if (CLEAN) {
        await Promise.all([
            Category.deleteMany(), Service.deleteMany(), Agent.deleteMany(), Coupon.deleteMany(),
            Booking.deleteMany(), Review.deleteMany(), User.deleteMany({ isAdmin: { $ne: true } }),
        ]);
        console.log('   Cleaned: categories, services, agents, coupons, bookings, reviews, customers');
    }

    // Categories
    const categoryMap = {};
    for (const cat of categoriesData) {
        const existing = await Category.findOne({ slug: cat.slug });
        if (existing) { categoryMap[cat.slug] = existing._id; continue; }
        const created = await Category.create(cat);
        categoryMap[cat.slug] = created._id;
    }
    console.log(`   Seeded: ${Object.keys(categoryMap).length} categories`);

    // Services
    let serviceCount = 0;
    for (const [slug, services] of Object.entries(servicesByCategorySlug)) {
        const categoryId = categoryMap[slug];
        if (!categoryId) continue;
        for (const svc of services) {
            const existing = await Service.findOne({ slug: svc.slug });
            if (existing) continue;
            await Service.create({ ...svc, categoryId });
            serviceCount++;
        }
        await Category.findByIdAndUpdate(categoryId, { serviceCount: await Service.countDocuments({ categoryId, isActive: true }) });
    }
    console.log(`   Seeded: ${serviceCount} services`);

    // Agents
    let agentCount = 0;
    for (const agentData of agentsData) {
        const existing = await Agent.findOne({ phone: agentData.phone });
        if (existing) continue;
        const skillIds = agentData.skills.map(slug => categoryMap[slug]).filter(Boolean);
        await Agent.create({ ...agentData, skills: skillIds });
        agentCount++;
    }
    console.log(`   Seeded: ${agentCount} agents`);

    // Coupons
    const coupons = [
        { code: 'WELCOME50', description: '50% off first booking', type: 'percent', value: 50, maxDiscount: 300, minOrderValue: 200, isFirstBookingOnly: true, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 864e5), maxUses: 1000 },
        { code: 'FLAT100',   description: '₹100 off any booking',  type: 'flat',    value: 100, minOrderValue: 499, validFrom: new Date(), validUntil: new Date(Date.now() + 30 * 864e5), maxUses: 500 },
        { code: 'CLEAN20',   description: '20% off cleaning',       type: 'percent', value: 20,  maxDiscount: 200, minOrderValue: 399, validFrom: new Date(), validUntil: new Date(Date.now() + 60 * 864e5), applicableCities: ['Bangalore', 'Mumbai'] },
    ];
    for (const coupon of coupons) {
        const existing = await Coupon.findOne({ code: coupon.code });
        if (!existing) await Coupon.create(coupon);
    }
    console.log(`   Seeded: ${coupons.length} coupons`);

    // Demo admin user
    const adminPhone = '+919000000001';
    await User.findOneAndUpdate(
        { phone: adminPhone },
        { $set: { name: 'Admin Realistan', email: 'admin@realistan.com', isActive: true, isVerified: true, isAdmin: true }, $setOnInsert: { phone: adminPhone } },
        { upsert: true }
    );
    console.log(`   Admin user ensured: ${adminPhone}`);

    // Customers
    const customerDocs = [];
    for (const customerData of customersData) {
        const existing = await User.findOne({ phone: customerData.phone });
        if (existing) { customerDocs.push(existing); continue; }
        customerDocs.push(await User.create(customerData));
    }
    console.log(`   Seeded: ${customerDocs.length} customers`);

    // Bookings + reviews (only generated once, on an empty collection)
    const serviceDocs = await Service.find({});
    const agentDocs = await Agent.find({});
    let bookingDocs = await Booking.find({});
    if (bookingDocs.length === 0) {
        const bookingInput = generateBookings({ services: serviceDocs, agents: agentDocs, customers: customerDocs, count: 260 });
        bookingDocs = await Booking.insertMany(bookingInput);
    }
    console.log(`   Seeded: ${bookingDocs.length} bookings`);

    const existingReviewCount = await Review.countDocuments();
    if (existingReviewCount === 0) {
        const reviewInput = generateReviews({ bookings: bookingDocs, reviewPhotoPool, coverage: 0.65 });
        const reviewDocs = await Review.insertMany(reviewInput);

        await Promise.all(reviewDocs.map((r) => Booking.findByIdAndUpdate(r.bookingId, { review: r._id })));

        const byService = new Map();
        const byAgent = new Map();
        for (const r of reviewDocs) {
            const sKey = String(r.serviceId);
            if (!byService.has(sKey)) byService.set(sKey, []);
            byService.get(sKey).push(r.rating);
            if (r.agentId) {
                const aKey = String(r.agentId);
                if (!byAgent.has(aKey)) byAgent.set(aKey, []);
                byAgent.get(aKey).push(r.rating);
            }
        }
        for (const [serviceId, ratings] of byService) {
            const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
            await Service.findByIdAndUpdate(serviceId, { rating: avg, ratingCount: ratings.length });
        }
        for (const [agentId, ratings] of byAgent) {
            const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
            await Agent.findByIdAndUpdate(agentId, { rating: avg, ratingCount: ratings.length });
        }
        console.log(`   Seeded: ${reviewDocs.length} reviews`);
    } else {
        console.log(`   Seeded: 0 reviews (${existingReviewCount} already exist)`);
    }

    await mongoose.disconnect();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log(`Seeding database: ${MONGO_URI}/${DB_NAME}${CLEAN ? ' [--clean]' : ''}`);
    await seedRealestate();
    await seedServeease();
    console.log('\nSeeding complete.\n');
}

run().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
