'use strict';
jest.mock('../../../src/services/databaseConnections');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../../src/app');
const { connectToDatabase } = require('../../../src/services/databaseConnections');

let mockCollection;

beforeEach(() => {
    mockCollection = { findOne: jest.fn() };
    connectToDatabase.mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) });
});

describe('POST /api/v1/realestate-admin/auth/login', () => {
    describe('Validation', () => {
        it('returns 400 when body is empty', async () => {
            const res = await request(app).post('/api/v1/realestate-admin/auth/login').send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed');
            expect(res.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ field: 'userName' }),
                    expect.objectContaining({ field: 'password' }),
                ])
            );
        });

        it('returns 400 when userName is not a valid email', async () => {
            const res = await request(app)
                .post('/api/v1/realestate-admin/auth/login')
                .send({ userName: 'notanemail', password: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.errors[0].field).toBe('userName');
            expect(res.body.errors[0].message).toBe('Must be a valid email');
        });

        it('returns 400 when password is shorter than 6 characters', async () => {
            const res = await request(app)
                .post('/api/v1/realestate-admin/auth/login')
                .send({ userName: 'test@test.com', password: '123' });
            expect(res.status).toBe(400);
            expect(res.body.errors[0].field).toBe('password');
        });
    });

    describe('Business logic', () => {
        it('returns 401 when user is not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);
            const res = await request(app)
                .post('/api/v1/realestate-admin/auth/login')
                .send({ userName: 'notfound@test.com', password: 'password123' });
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('No user found');
        });

        it('returns 401 when password does not match', async () => {
            const hash = bcrypt.hashSync('differentpassword', 1);
            mockCollection.findOne.mockResolvedValue({
                email: 'test@test.com', password: hash,
                userID: 'u1', authername: 'testuser', readAccess: [], writeAccess: [],
            });
            const res = await request(app)
                .post('/api/v1/realestate-admin/auth/login')
                .send({ userName: 'test@test.com', password: 'password123' });
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Password does not match');
        });

        it('returns 200 with token and user info on valid credentials', async () => {
            const hash = bcrypt.hashSync('password123', 1);
            mockCollection.findOne.mockResolvedValue({
                email: 'admin@realistan.in', password: hash,
                userID: 'u1', authername: 'saisanath',
                readAccess: ['User', 'Articles'], writeAccess: ['User', 'Articles'],
            });
            const res = await request(app)
                .post('/api/v1/realestate-admin/auth/login')
                .send({ userName: 'admin@realistan.in', password: 'password123' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(typeof res.body.token).toBe('string');
            expect(res.body.userName).toBe('saisanath');
            expect(res.body.readAccess).toEqual(['User', 'Articles']);
        });
    });
});
