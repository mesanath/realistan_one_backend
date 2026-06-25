'use strict';
jest.mock('../../../src/services/databaseConnections');

const request = require('supertest');
const app = require('../../../src/app');
const { connectToDatabase, getMany } = require('../../../src/services/databaseConnections');
const { generateToken, generateNoAccessToken, generateReadOnlyToken } = require('./helpers/token.helper');

const TOKEN = generateToken();
const NO_ACCESS_TOKEN = generateNoAccessToken();
const READ_ONLY_TOKEN = generateReadOnlyToken();

let mockCollection;

beforeEach(() => {
    mockCollection = {
        findOne: jest.fn(),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'new_id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    connectToDatabase.mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) });
});

// ─── GET /api/v1/realestate-admin/admin/users ─────────────────────────────────────────────────

describe('GET /api/v1/realestate-admin/admin/users', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).get('/api/v1/realestate-admin/admin/users?type=list');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user has no readAccess: User', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=list')
            .set('Authorization', `Bearer ${NO_ACCESS_TOKEN}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Action not allowed');
    });

    it('returns 400 when type param is invalid', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=wrong')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('type');
    });

    it('returns 400 when type=edit but userID is missing', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=edit')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('userID');
    });

    it('returns 200 with full list when type=list', async () => {
        getMany.mockResolvedValue([
            { userID: 'u1', email: 'a@b.com', authername: 'alpha' },
            { userID: 'u2', email: 'c@d.com', authername: 'beta' },
        ]);
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=list')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
    });

    it('returns 200 with single user when type=edit with userID', async () => {
        getMany.mockResolvedValue([{ userID: 'u1', email: 'a@b.com' }]);
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=edit&userID=u1')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.data[0].userID).toBe('u1');
    });

    it('returns 200 with empty array when no users', async () => {
        getMany.mockResolvedValue([]);
        const res = await request(app)
            .get('/api/v1/realestate-admin/admin/users?type=list')
            .set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });
});

// ─── POST /api/v1/realestate-admin/admin/users ────────────────────────────────────────────────

describe('POST /api/v1/realestate-admin/admin/users', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).post('/api/v1/realestate-admin/admin/users').send({});
        expect(res.status).toBe(401);
    });

    it('returns 403 when user has no writeAccess: User', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${READ_ONLY_TOKEN}`)
            .send({ email: 'x@y.com', authername: 'xyz', password: 'password123' });
        expect(res.status).toBe(403);
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'bademail', authername: 'testuser', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('email');
    });

    it('returns 400 when authername is too short', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'x@y.com', authername: 'ab', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('authername');
    });

    it('returns 400 when readAccess has invalid level', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'x@y.com', authername: 'validname', password: 'password123', readAccess: ['InvalidLevel'] });
        expect(res.status).toBe(400);
    });

    it('returns success=false when email already exists', async () => {
        mockCollection.findOne.mockResolvedValue({ email: 'exists@test.com' });
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'exists@test.com', authername: 'newuser', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.field).toBe('email');
    });

    it('returns success=false when authername already exists', async () => {
        mockCollection.findOne.mockResolvedValue({ authername: 'takenname' });
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'new@test.com', authername: 'takenname', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.field).toBe('authername');
    });

    it('creates user successfully with valid data', async () => {
        mockCollection.findOne.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/v1/realestate-admin/admin/users')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({
                email: 'new@test.com', authername: 'newuser', password: 'password123',
                readAccess: ['User'], writeAccess: ['Articles'],
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('User created successfully');
        expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });
});

// ─── PUT /api/v1/realestate-admin/admin/users/:userID ─────────────────────────────────────────

describe('PUT /api/v1/realestate-admin/admin/users/:userID', () => {
    it('returns 401 with no token', async () => {
        const res = await request(app).put('/api/v1/realestate-admin/admin/users/u1').send({});
        expect(res.status).toBe(401);
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .put('/api/v1/realestate-admin/admin/users/u1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'bademail', authername: 'validname' });
        expect(res.status).toBe(400);
    });

    it('returns success=false when email is taken by another user', async () => {
        mockCollection.findOne.mockResolvedValue({ email: 'taken@test.com', userID: 'other' });
        const res = await request(app)
            .put('/api/v1/realestate-admin/admin/users/u1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'taken@test.com', authername: 'validname' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.field).toBe('email');
    });

    it('updates user without changing password when password is omitted', async () => {
        mockCollection.findOne.mockResolvedValue(null);
        const res = await request(app)
            .put('/api/v1/realestate-admin/admin/users/u1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'update@test.com', authername: 'updatedname' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const updateCall = mockCollection.updateOne.mock.calls[0][1].$set;
        expect(updateCall.password).toBeUndefined();
    });

    it('updates user with new password when password is provided', async () => {
        mockCollection.findOne.mockResolvedValue(null);
        const res = await request(app)
            .put('/api/v1/realestate-admin/admin/users/u1')
            .set('Authorization', `Bearer ${TOKEN}`)
            .send({ email: 'update@test.com', authername: 'updatedname', password: 'newpassword123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const updateCall = mockCollection.updateOne.mock.calls[0][1].$set;
        expect(updateCall.password).toBeDefined();
    });
});
