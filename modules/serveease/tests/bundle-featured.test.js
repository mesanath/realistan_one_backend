/**
 * GET /services/bundles/featured — home-page combo deals, no anchor service needed (unlike
 * GET /services/:id/bundles, which requires viewing a specific service first).
 */

jest.mock('../../../src/middleware/rateLimit.middleware', () => {
  const pass = (_req, _res, next) => next();
  return { otpRateLimit: pass, apiRateLimit: pass, bookingCreateLimit: pass, otpVerifyLimit: pass, agentActionLimit: pass, adminMutationLimit: pass };
});

const request = require('supertest');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');

const Category = require('../models/Category');
const Service = require('../models/Service');

let app;

beforeAll(async () => {
  process.env.PORT = '0';
  await connectTestDb();
  await clearTestDb();
  app = require('../../../src/app');
});

afterAll(async () => {
  await closeTestDb();
});

describe('GET /services/bundles/featured', () => {
  beforeAll(async () => {
    const cleaning = await Category.create({ name: 'Home Cleaning', slug: 'home-cleaning-bf' });
    const kitchen = await Category.create({ name: 'Kitchen Cleaning', slug: 'kitchen-cleaning-bf' });

    // Matches BUNDLE_RULES: primaryCategories:['cleaning','bathroom'] -> suggestCategories:['kitchen'], discount 20
    await Service.create({
      categoryId: cleaning._id, name: 'Deep Cleaning', slug: 'deep-cleaning-bf',
      basePrice: 1000, durationMinutes: 60, bookingCount: 50, isActive: true,
    });
    await Service.create({
      categoryId: kitchen._id, name: 'Kitchen Deep Clean', slug: 'kitchen-deep-clean-bf',
      basePrice: 500, durationMinutes: 45, bookingCount: 30, isActive: true,
    });
  });

  it('returns a combo deal with correct discount math, no service id needed', async () => {
    const res = await request(app).get('/api/v1/serveease/services/bundles/featured');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const deal = res.body.data.find((d) => d.primaryService.slug === 'deep-cleaning-bf');
    expect(deal).toBeTruthy();
    expect(deal.suggestedService.slug).toBe('kitchen-deep-clean-bf');
    expect(deal.discountPercent).toBe(20);
    expect(deal.suggestedService.discountedPrice).toBe(400); // 500 * 0.8
    expect(deal.combinedOriginalPrice).toBe(1500);
    expect(deal.combinedDiscountedPrice).toBe(1400);
    expect(deal.youSave).toBe(100);
  });

  it('respects the limit query param', async () => {
    const res = await request(app).get('/api/v1/serveease/services/bundles/featured?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });
});
