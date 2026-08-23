'use strict';
// Covers the customer_services_management split introduced in
// constants/adminRoles.js: CS can update lease/loan status (InquiryStatus)
// but cannot create or delete inquiries (Inquiries). Uses lease routes only —
// loans.routes.js is gated identically.
jest.mock('../../../src/services/databaseConnections');

const request = require('supertest');
const app = require('../../../src/app');
const { connectToDatabase } = require('../../../src/services/databaseConnections');
const { generateToken } = require('./helpers/token.helper');

// customer_services_management-shaped token: read on Inquiries, write only on
// InquiryStatus — matches REALISTAN_ACCESS_BY_ROLE.customer_services_management.
const CS_TOKEN = generateToken({
    readAccess: ['Articles', 'User', 'Inquiries'],
    writeAccess: ['InquiryStatus'],
});

let mockCollection;

beforeEach(() => {
    mockCollection = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        findOne: jest.fn().mockResolvedValue({ leaseID: 'l1' }),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'new_id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    connectToDatabase.mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) });
});

describe('customer_services_management on /api/v1/realestate-admin/lease', () => {
    it('can list leases (Inquiries:read)', async () => {
        const res = await request(app)
            .get('/api/v1/realestate-admin/lease')
            .set('Authorization', `Bearer ${CS_TOKEN}`);
        expect(res.status).toBe(200);
    });

    it('can update lease status (InquiryStatus:write)', async () => {
        const res = await request(app)
            .put('/api/v1/realestate-admin/lease/l1')
            .set('Authorization', `Bearer ${CS_TOKEN}`)
            .send({ status: 'leased' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('cannot create a new lease listing (Inquiries:write required, not granted)', async () => {
        const res = await request(app)
            .post('/api/v1/realestate-admin/lease')
            .set('Authorization', `Bearer ${CS_TOKEN}`)
            .send({ title: 'New listing', propertyType: 'Apartment', location: 'Bangalore' });
        expect(res.status).toBe(403);
    });

    it('cannot delete a lease (Inquiries:write required, not granted)', async () => {
        const res = await request(app)
            .delete('/api/v1/realestate-admin/lease/l1')
            .set('Authorization', `Bearer ${CS_TOKEN}`);
        expect(res.status).toBe(403);
    });
});
