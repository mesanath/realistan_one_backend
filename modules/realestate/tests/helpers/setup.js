'use strict';
require('dotenv').config();
const request = require('supertest');
const { db } = require('../../../../src/utils/dbs');

const TEST_MOBILE = '+919000000001';
const TEST_OTP    = '654321';

// ── App (lazily started once per process) ────────────────────────────────────
let _app;
function getApp() {
    if (!_app) {
        const mod = require('../../../../server');
        _app = mod.app;
    }
    return _app;
}

async function ensureReady() {
    getApp();
    for (let i = 0; i < 50; i++) {
        if (db.get()) return;
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('MongoDB did not connect within 5 seconds');
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
async function seedOtp() {
    await ensureReady();
    await db.get().collection('otp').updateOne(
        { mobile: TEST_MOBILE },
        { $set: { mobile: TEST_MOBILE, otp: TEST_OTP, session_id: 'test', source: 'test', createdAt: new Date(), otpCount: 1 } },
        { upsert: true }
    );
}

async function getAuthToken() {
    await seedOtp();
    const res = await request(getApp())
        .post('/api/v1/realestate/auth/loginbymobile/verify')
        .send({ mobile: TEST_MOBILE, otp: TEST_OTP, whatsappFlag: false });
    return res.body.token;
}

// ── Property helpers ──────────────────────────────────────────────────────────
async function createTestProperty(token, overrides = {}) {
    const res = await request(getApp())
        .post('/api/v1/realestate/properties/addproperties')
        .set('authorization', token)
        .send({
            title: 'Test Suite Property',
            listingType: 'sale',
            buildingType: 'Apartment',
            propertyType: 'Residential',
            possessionStatus: 'Ready To Move',
            price: '4500000',
            area: '1100',
            areaCarpet: '950',
            location: 'Test Nagar',
            city: 'Bangalore',
            postalCode: '560001',
            houseType: '2 BHK',
            bathsType: '2',
            coveredParking: '1',
            coveredUnParking: '1',
            defineSizeStructure: '2BHK with balcony',
            uploadedPaths: [{ id: 'img1', path: 'test/img1.jpg' }, { id: 'vid1', path: 'test/vid1.mp4', type: 'video' }],
            amenitiesDetails: [{ name: 'swimming pool', count: 1 }, { name: 'ATM', count: 0 }],
            furnishingDetails: [{ name: 'AC', count: 2 }, { name: 'fan', count: 0 }],
            additionalRooms: ['Pooja Room', 'Study Room'],
            landmarkHospital: 'Apollo 2km',
            landmarkTransportation: 'Metro 500m',
            aboutProperty: 'Test property',
            ...overrides,
        });
    return res.body.data;
}

// ── Teardown helpers ──────────────────────────────────────────────────────────
async function cleanupTestUser() {
    await ensureReady();
    const database = db.get();
    await database.collection('otp').deleteMany({ mobile: TEST_MOBILE });
    await database.collection('otp').deleteMany({ mobile: `${TEST_MOBILE}-verification` });
    await database.collection('userAccounts').deleteMany({ mobile: TEST_MOBILE });
    await database.collection('userTokens').deleteMany({ mobile: TEST_MOBILE });
}

async function cleanupTestProperties() {
    await ensureReady();
    await db.get().collection('properties').deleteMany({ location: 'Test Nagar' });
}

async function cleanupContactRequests(propertyID) {
    if (!propertyID) return;
    await ensureReady();
    await db.get().collection('contactRequests').deleteMany({ propertyID });
}

async function clearShortlist() {
    await ensureReady();
    await db.get().collection('userAccounts').updateMany(
        { mobile: TEST_MOBILE },
        { $set: { savedProperties: [] } }
    );
}

module.exports = {
    getApp,
    ensureReady,
    getAuthToken,
    seedOtp,
    createTestProperty,
    cleanupTestUser,
    cleanupTestProperties,
    cleanupContactRequests,
    clearShortlist,
    TEST_MOBILE,
    TEST_OTP,
};
