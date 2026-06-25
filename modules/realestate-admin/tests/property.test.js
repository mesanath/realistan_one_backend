'use strict';
jest.mock('../../../src/services/databaseConnections');

const request = require('supertest');
const app = require('../../../src/app');
const { connectToDatabase } = require('../../../src/services/databaseConnections');
const { generateToken, generateNoAccessToken } = require('./helpers/token.helper');

const TOKEN = generateToken();
const NO_ACCESS_TOKEN = generateNoAccessToken();

let mockCollection;

beforeEach(() => {
    mockCollection = {
        findOne: jest.fn(),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'id1' }),
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    connectToDatabase.mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) });
});

const validProperty = {
    title: '3BHK Apartment',
    listingType: 'Sell',
    houseType: 'Apartment',
    location: 'Mumbai',
    postalCode: '400001',
};

// ─── GET /api/v1/realestate-admin/properties ───────────────────────────────────────────────────

describe('GET /api/v1/realestate-admin/properties', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).get('/api/v1/realestate-admin/properties');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user has no readAccess', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${NO_ACCESS_TOKEN}`);
        expect(res.status).toBe(403);
    });

    it('returns 200 with empty array when no properties exist', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual([]);
    });

    it('returns 200 with properties list', async () => {
        mockCollection.find.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
                { propertyID: 'prop-1', title: '3BHK' },
                { propertyID: 'prop-2', title: '2BHK' },
            ]),
        });
        const res = await request(app)
            .get('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0].propertyID).toBe('prop-1');
    });
});

// ─── GET /api/v1/realestate-admin/properties/:propertyID ──────────────────────────────────────

describe('GET /api/v1/realestate-admin/properties/:propertyID', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).get('/api/v1/realestate-admin/properties/prop-1');
        expect(res.status).toBe(401);
    });

    it('returns 404 when property does not exist', async () => {
        mockCollection.findOne.mockResolvedValue(null);
        const res = await request(app)
            .get('/api/v1/realestate-admin/properties/nonexistent')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Property not found');
    });

    it('returns 200 with property data', async () => {
        mockCollection.findOne.mockResolvedValue({ propertyID: 'prop-1', title: '3BHK', price: '8500000' });
        const res = await request(app)
            .get('/api/v1/realestate-admin/properties/prop-1')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.propertyID).toBe('prop-1');
        expect(res.body.data.title).toBe('3BHK');
    });
});

// ─── POST /api/v1/realestate-admin/properties ──────────────────────────────────────────────────

describe('POST /api/v1/realestate-admin/properties', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).post('/api/v1/realestate-admin/properties').send(validProperty);
        expect(res.status).toBe(401);
    });

    it('returns 400 when title is missing', async () => {
        const { title: _title, ...withoutTitle } = validProperty;
        const res = await request(app)
            .post('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send(withoutTitle);
        expect(res.status).toBe(400);
        expect(res.body.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('returns 400 when listingType is not Sell or Rent', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ ...validProperty, listingType: 'Buy' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('listingType');
    });

    it('returns 400 when required location fields are missing', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ title: 'Test', listingType: 'Sell' });
        expect(res.status).toBe(400);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('creates property and returns auto-generated propertyID', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send(validProperty);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.propertyID).toBeDefined();
        expect(res.body.propertyID).toContain('3bhk-apartment');
        expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });

    it('creates property with optional fields', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/properties')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({
                ...validProperty,
                price: '8500000', city: 'Mumbai',
                amenitiesDetails: [{ name: 'Pool', count: 1 }],
                furnishingDetails: [{ name: 'Bed', count: 2 }],
                uploadedPaths: [{ id: 'img1', path: 'https://example.com/img.jpg' }],
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ─── PUT /api/v1/realestate-admin/properties/:propertyID ──────────────────────────────────────

describe('PUT /api/v1/realestate-admin/properties/:propertyID', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).put('/api/v1/realestate-admin/properties/prop-1').send({ price: '9000000' });
        expect(res.status).toBe(401);
    });

    it('returns 400 when body is empty', async () => {
        const res = await request(app)
            .put('/api/v1/realestate-admin/properties/prop-1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('updates property and does not allow changing propertyID', async () => {
        const res = await request(app)
            .put('/api/v1/realestate-admin/properties/prop-1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ price: '9500000', furnishingStatus: 'Furnished' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const updatePayload = mockCollection.updateOne.mock.calls[0][1].$set;
        expect(updatePayload.propertyID).toBeUndefined();
        expect(updatePayload.updatedAt).toBeDefined();
    });
});
