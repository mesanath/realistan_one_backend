'use strict';
jest.mock('../../../src/services/databaseConnections');

const request = require('supertest');
const app = require('../../../src/app');
const { connectToDatabase } = require('../../../src/services/databaseConnections');
const { generateToken, generateNoAccessToken } = require('./helpers/token.helper');

const TOKEN = generateToken();
const NO_WRITE_TOKEN = generateNoAccessToken();

let mockCollection;

beforeEach(() => {
    mockCollection = { insertOne: jest.fn().mockResolvedValue({ insertedId: 'cat1' }) };
    connectToDatabase.mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) });
});

describe('POST /api/v1/realestate-admin/homepage/categories', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .send({ catname: 'Luxury Villas' });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user has no writeAccess: Articles', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .set('Authorization', `Bearer ${NO_WRITE_TOKEN}`)
            .send({ catname: 'Luxury Villas' });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Action not allowed');
    });

    it('returns 400 when catname is missing', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation failed');
        expect(res.body.errors[0].field).toBe('catname');
    });

    it('returns 400 when catname is empty string', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ catname: '' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('catname');
    });

    it('returns 400 when catname exceeds 100 characters', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ catname: 'A'.repeat(101) });
        expect(res.status).toBe(400);
    });

    it('creates category successfully', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/homepage/categories')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ catname: 'Luxury Villas' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Inserted successfully');
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
            expect.objectContaining({ catname: 'Luxury Villas' })
        );
    });
});
