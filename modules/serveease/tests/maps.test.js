/**
 * Integration tests for the Google Places proxy.
 * Routes: GET /api/v1/serveease/maps/autocomplete, /place-details, /directions-url
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connectTestDb, clearTestDb, closeTestDb } = require('./test-utils/db');

const User = require('../models/User');

let app;
let token;

beforeAll(async () => {
  process.env.PORT = '0';
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  await connectTestDb();
  await clearTestDb();
  app = require('../../../src/app');

  const user = await User.create({ name: 'Maps Test Customer', phone: '+919844400001' });
  token = jwt.sign({ id: user._id, phone: user.phone, role: 'customer' }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await closeTestDb();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/v1/serveease/maps/autocomplete', () => {
  it('returns 401 with no auth token', async () => {
    const res = await request(app).get('/api/v1/serveease/maps/autocomplete').query({ input: 'Koramangala' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when input is missing', async () => {
    const res = await request(app).get('/api/v1/serveease/maps/autocomplete').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('maps Google predictions to a simplified shape', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'abc123',
            description: 'Koramangala, Bengaluru, Karnataka, India',
            structured_formatting: { main_text: 'Koramangala', secondary_text: 'Bengaluru, Karnataka, India' },
          },
        ],
      }),
    });

    const res = await request(app)
      .get('/api/v1/serveease/maps/autocomplete')
      .query({ input: 'Koramangala' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([
      { placeId: 'abc123', description: 'Koramangala, Bengaluru, Karnataka, India', mainText: 'Koramangala', secondaryText: 'Bengaluru, Karnataka, India' },
    ]);
  });

  it('returns 502 when Google returns an error status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ status: 'REQUEST_DENIED', error_message: 'bad key' }),
    });

    const res = await request(app)
      .get('/api/v1/serveease/maps/autocomplete')
      .query({ input: 'Koramangala' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/serveease/maps/place-details', () => {
  it('returns 400 when placeId is missing', async () => {
    const res = await request(app).get('/api/v1/serveease/maps/place-details').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('extracts city, pincode and lat/lng from address_components', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        status: 'OK',
        result: {
          formatted_address: '123 Test Street, Koramangala, Bengaluru, Karnataka 560095, India',
          address_components: [
            { long_name: 'Bengaluru', types: ['locality'] },
            { long_name: '560095', types: ['postal_code'] },
          ],
          geometry: { location: { lat: 12.9352, lng: 77.6146 } },
        },
      }),
    });

    const res = await request(app)
      .get('/api/v1/serveease/maps/place-details')
      .query({ placeId: 'abc123' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      addressLine: '123 Test Street, Koramangala, Bengaluru, Karnataka 560095, India',
      city: 'Bengaluru',
      pincode: '560095',
      lat: 12.9352,
      lng: 77.6146,
    });
  });
});

describe('GET /api/v1/serveease/maps/directions-url', () => {
  it('returns 400 when destination is missing', async () => {
    const res = await request(app).get('/api/v1/serveease/maps/directions-url').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('builds a directions URL with both origin and destination', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/maps/directions-url')
      .query({ destLat: '12.93', destLng: '77.61', originLat: '12.97', originLng: '77.59' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=12.93%2C77.61&origin=12.97%2C77.59'
    );
  });

  it('builds a destination-only URL when origin is unknown', async () => {
    const res = await request(app)
      .get('/api/v1/serveease/maps/directions-url')
      .query({ destLat: '12.93', destLng: '77.61' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://www.google.com/maps/dir/?api=1&destination=12.93%2C77.61');
  });
});
