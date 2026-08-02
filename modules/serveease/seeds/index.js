require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const categoriesData = require('./categories.seed');
const servicesByCategorySlug = require('./services.seed');
const agentsData = require('./agents.seed');
const customersData = require('./customers.seed');
const generateBookings = require('./bookings.seed');
const generateReviews = require('./reviews.seed');
const { reviews: reviewPhotoPool } = require('./image-assets.json');

const isFresh = process.argv.includes('--fresh');
const BOOKING_COUNT = 260;

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  if (isFresh) {
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Category.deleteMany(), Service.deleteMany(), Agent.deleteMany(), Coupon.deleteMany(),
      Booking.deleteMany(), Review.deleteMany(), User.deleteMany({ isAdmin: { $ne: true } }),
    ]);
    console.log('   Cleared: categories, services, agents, coupons, bookings, reviews, customers');
  }

  // ─── 1. Seed Categories ────────────────────────────────
  console.log('\n📂 Seeding categories...');
  const categoryMap = {};
  for (const cat of categoriesData) {
    const existing = await Category.findOne({ slug: cat.slug });
    if (existing) { categoryMap[cat.slug] = existing._id; console.log(`   ↩  Skipped (exists): ${cat.name}`); continue; }
    const created = await Category.create(cat);
    categoryMap[cat.slug] = created._id;
    console.log(`   ✔  Created: ${cat.name}`);
  }

  // ─── 2. Seed Services ──────────────────────────────────
  console.log('\n🛎️  Seeding services...');
  const serviceDocs = [];
  for (const [slug, services] of Object.entries(servicesByCategorySlug)) {
    const categoryId = categoryMap[slug];
    if (!categoryId) { console.log(`   ⚠️  Category not found: ${slug}`); continue; }
    for (const svc of services) {
      const existing = await Service.findOne({ slug: svc.slug });
      if (existing) { serviceDocs.push(existing); console.log(`   ↩  Skipped (exists): ${svc.name}`); continue; }
      const created = await Service.create({ ...svc, categoryId });
      serviceDocs.push(created);
      console.log(`   ✔  Created: ${svc.name} (${slug})`);
    }
    await Category.findByIdAndUpdate(categoryId, { serviceCount: await Service.countDocuments({ categoryId, isActive: true }) });
  }

  // ─── 3. Seed Agents (resolve skill slugs → category IDs) ──
  console.log('\n👤 Seeding agents...');
  const agentDocs = [];
  for (const agentData of agentsData) {
    const existing = await Agent.findOne({ phone: agentData.phone });
    if (existing) { agentDocs.push(existing); console.log(`   ↩  Skipped (exists): ${agentData.name}`); continue; }
    const skillIds = agentData.skills
      .map((slug) => categoryMap[slug])
      .filter(Boolean);
    const created = await Agent.create({ ...agentData, skills: skillIds });
    agentDocs.push(created);
    console.log(`   ✔  Created agent: ${agentData.name} (${agentData.city})`);
  }

  // ─── 4. Seed Demo Admin User ───────────────────────────
  console.log('\n🔑 Seeding admin user...');
  const adminPhone = '+919000000001';
  const existingAdmin = await User.findOne({ phone: adminPhone });
  if (!existingAdmin) {
    await User.create({ name: 'Admin Realistan', phone: adminPhone, email: 'admin@realistan.com', isActive: true, isVerified: true, isAdmin: true });
    console.log(`   ✔  Admin user created: ${adminPhone}`);
  } else {
    await User.findOneAndUpdate({ phone: adminPhone }, { isAdmin: true });
    console.log(`   ↩  Admin already exists (isAdmin flag ensured)`);
  }

  // ─── 5. Seed Customers ─────────────────────────────────
  console.log('\n🧑‍🤝‍🧑 Seeding customers...');
  const customerDocs = [];
  for (const customerData of customersData) {
    const existing = await User.findOne({ phone: customerData.phone });
    if (existing) { customerDocs.push(existing); console.log(`   ↩  Skipped (exists): ${customerData.name}`); continue; }
    const created = await User.create(customerData);
    customerDocs.push(created);
    console.log(`   ✔  Created customer: ${customerData.name}`);
  }

  // ─── 6. Seed Sample Coupons ───────────────────────────
  console.log('\n🎟️  Seeding coupons...');
  const coupons = [
    { code: 'WELCOME50', description: '50% off first booking', type: 'percent', value: 50, maxDiscount: 300, minOrderValue: 200, isFirstBookingOnly: true, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 864e5), maxUses: 1000 },
    { code: 'FLAT100', description: '₹100 off', type: 'flat', value: 100, minOrderValue: 499, validFrom: new Date(), validUntil: new Date(Date.now() + 30 * 864e5), maxUses: 500 },
    { code: 'CLEAN20', description: '20% off cleaning', type: 'percent', value: 20, maxDiscount: 200, minOrderValue: 399, validFrom: new Date(), validUntil: new Date(Date.now() + 60 * 864e5), applicableCities: ['Bangalore', 'Mumbai'] },
  ];
  for (const coupon of coupons) {
    const existing = await Coupon.findOne({ code: coupon.code });
    if (existing) { console.log(`   ↩  Skipped: ${coupon.code}`); continue; }
    await Coupon.create(coupon);
    console.log(`   ✔  Coupon: ${coupon.code}`);
  }

  // ─── 7. Seed Bookings (past history + a few upcoming) ──
  console.log('\n📅 Seeding bookings...');
  let bookingDocs = [];
  const existingBookingCount = await Booking.countDocuments();
  if (existingBookingCount === 0) {
    const bookingInput = generateBookings({ services: serviceDocs, agents: agentDocs, customers: customerDocs, count: BOOKING_COUNT });
    bookingDocs = await Booking.insertMany(bookingInput);
    console.log(`   ✔  Created ${bookingDocs.length} bookings`);
  } else {
    bookingDocs = await Booking.find({});
    console.log(`   ↩  Skipped (${existingBookingCount} bookings already exist)`);
  }

  // ─── 8. Seed Reviews (for a share of completed bookings) ──
  console.log('\n⭐ Seeding reviews...');
  let reviewDocs = [];
  const existingReviewCount = await Review.countDocuments();
  if (existingReviewCount === 0) {
    const reviewInput = generateReviews({ bookings: bookingDocs, reviewPhotoPool, coverage: 0.65 });
    reviewDocs = await Review.insertMany(reviewInput);
    console.log(`   ✔  Created ${reviewDocs.length} reviews`);

    // Link bookings back to their review
    await Promise.all(reviewDocs.map((r) => Booking.findByIdAndUpdate(r.bookingId, { review: r._id })));

    // Recompute service & agent rating aggregates from real review data
    const byService = new Map();
    const byAgent = new Map();
    for (const r of reviewDocs) {
      const sKey = String(r.serviceId);
      const aKey = String(r.agentId);
      if (!byService.has(sKey)) byService.set(sKey, []);
      byService.get(sKey).push(r.rating);
      if (r.agentId) {
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
    console.log(`   ✔  Recomputed ratings for ${byService.size} services and ${byAgent.size} agents`);
  } else {
    console.log(`   ↩  Skipped (${existingReviewCount} reviews already exist)`);
  }

  // ─── Summary ───────────────────────────────────────────
  const [catCount, svcCount, agentCount, customerCount, bookingCount, reviewCount] = await Promise.all([
    Category.countDocuments(), Service.countDocuments(), Agent.countDocuments(),
    User.countDocuments({ isAdmin: { $ne: true } }), Booking.countDocuments(), Review.countDocuments(),
  ]);
  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Seeding complete!`);
  console.log(`   Categories : ${catCount}`);
  console.log(`   Services   : ${svcCount}`);
  console.log(`   Agents     : ${agentCount}`);
  console.log(`   Customers  : ${customerCount}`);
  console.log(`   Bookings   : ${bookingCount}`);
  console.log(`   Reviews    : ${reviewCount}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
