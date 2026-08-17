'use strict';
require('dotenv').config();
const request = require('supertest');
const { db } = require('../../../../src/utils/dbs');
const User = require('../../../../src/models/User');
const { storeOtp } = require('../../../../src/auth/otpEngine');

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
// Writes the OTP directly into the shared login system's store, bypassing the
// send-otp endpoint (SMS dispatch + fraud/rate-limit checks) — same approach the
// old helper used against the Mongo `otp` collection, now against otpEngine's store.
async function seedOtp() {
    await ensureReady();
    await storeOtp(TEST_MOBILE, TEST_OTP);
}

async function getAuthToken() {
    await seedOtp();
    const res = await request(getApp())
        .post('/api/v1/auth/verify-otp')
        .send({ mobile: TEST_MOBILE, otp: TEST_OTP });
    return res.body.tokens?.access || res.body.token;
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
    await User.deleteMany({ phone: TEST_MOBILE });
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
    await User.updateMany({ phone: TEST_MOBILE }, { $set: { savedProperties: [] } });
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
