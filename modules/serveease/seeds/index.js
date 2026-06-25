require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Coupon = require('../models/Coupon');

const categoriesData = require('./categories.seed');
const servicesByCategorySlug = require('./services.seed');
const agentsData = require('./agents.seed');

const isFresh = process.argv.includes('--fresh');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  if (isFresh) {
    console.log('🗑️  Clearing existing data...');
    await Promise.all([Category.deleteMany(), Service.deleteMany(), Agent.deleteMany(), Coupon.deleteMany()]);
    console.log('   Cleared: categories, services, agents, coupons');
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
  for (const [slug, services] of Object.entries(servicesByCategorySlug)) {
    const categoryId = categoryMap[slug];
    if (!categoryId) { console.log(`   ⚠️  Category not found: ${slug}`); continue; }
    for (const svc of services) {
      const existing = await Service.findOne({ slug: svc.slug });
      if (existing) { console.log(`   ↩  Skipped (exists): ${svc.name}`); continue; }
      await Service.create({ ...svc, categoryId });
      console.log(`   ✔  Created: ${svc.name} (${slug})`);
    }
    await Category.findByIdAndUpdate(categoryId, { serviceCount: await Service.countDocuments({ categoryId, isActive: true }) });
  }

  // ─── 3. Seed Agents (resolve skill slugs → category IDs) ──
  console.log('\n👤 Seeding agents...');
  for (const agentData of agentsData) {
    const existing = await Agent.findOne({ phone: agentData.phone });
    if (existing) { console.log(`   ↩  Skipped (exists): ${agentData.name}`); continue; }
    const skillIds = agentData.skills
      .map((slug) => categoryMap[slug])
      .filter(Boolean);
    await Agent.create({ ...agentData, skills: skillIds });
    console.log(`   ✔  Created agent: ${agentData.name} (${agentData.city})`);
  }

  // ─── 4. Seed Demo Admin User ───────────────────────────
  console.log('\n🔑 Seeding admin user...');
  const adminPhone = '+919000000001';
  const existing = await User.findOne({ phone: adminPhone });
  if (!existing) {
    await User.create({ name: 'Admin Realistan', phone: adminPhone, email: 'admin@realistan.com', isActive: true, isVerified: true, isAdmin: true });
    console.log(`   ✔  Admin user created: ${adminPhone}`);
  } else {
    // Ensure existing admin has isAdmin flag set
    await User.findOneAndUpdate({ phone: adminPhone }, { isAdmin: true });
    console.log(`   ↩  Admin already exists (isAdmin flag ensured)`);
  }

  // ─── 5. Seed Sample Coupons ───────────────────────────
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

  // ─── Summary ───────────────────────────────────────────
  const [catCount, svcCount, agentCount] = await Promise.all([
    Category.countDocuments(), Service.countDocuments(), Agent.countDocuments(),
  ]);
  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Seeding complete!`);
  console.log(`   Categories : ${catCount}`);
  console.log(`   Services   : ${svcCount}`);
  console.log(`   Agents     : ${agentCount}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
