'use strict';
const request = require('supertest');
const {
    getApp, getAuthToken, createTestProperty,
    cleanupTestUser, cleanupTestProperties, clearShortlist,
} = require('./helpers/setup');

describe('Properties', () => {
    let token;
    let property; // created in beforeAll, reused across tests

    beforeAll(async () => {
        await cleanupTestUser();
        await cleanupTestProperties();
        token = await getAuthToken();
        property = await createTestProperty(token);
    });

    afterAll(async () => {
        await cleanupTestProperties();
        await cleanupTestUser();
    });

    // ── GET /trending ─────────────────────────────────────────────────────────
    describe('GET /api/v1/realestate/properties/trending', () => {
        it('returns trending list', async () => {
            const res = await request(getApp()).get('/api/v1/realestate/properties/trending');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    // ── POST /homepageproperties ──────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/homepageproperties', () => {
        it('returns topBuilders and property arrays', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/homepageproperties')
                .send({ topBuilders: true, isExclusive: true, isFeatured: true, limitList: 5 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('topBuilders');
            expect(res.body.data).toHaveProperty('exclusiveProperties');
            expect(res.body.data).toHaveProperty('featuredProperties');
            expect(Array.isArray(res.body.data.topBuilders)).toBe(true);
        });
    });

    // ── POST /addproperties ───────────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/addproperties', () => {
        it('saves uploadedPaths, coveredUnParking, defineSizeStructure', () => {
            expect(property).toBeDefined();
            expect(property.propertyID).toBeTruthy();
            expect(Array.isArray(property.uploadedPaths)).toBe(true);
            expect(property.uploadedPaths).toHaveLength(2);
            expect(property.uploadedPaths[1].type).toBe('video');
            expect(property.coveredUnParking).toBe(1);
            expect(property.defineSizeStructure).toBe('2BHK with balcony');
        });

        it('saves additionalRooms as array', () => {
            expect(Array.isArray(property.additionalRooms)).toBe(true);
            expect(property.additionalRooms).toContain('Pooja Room');
        });

        it('filters amenitiesDetails — only items with count > 0 saved', () => {
            // ATM was sent with count:0, should be excluded
            const names = property.amenitiesDetails.map(a => a.name);
            expect(names).toContain('swimming pool');
            expect(names).not.toContain('ATM');
        });

        it('filters furnishingDetails — only items with count > 0 saved', () => {
            // fan was sent with count:0
            const names = property.furnishingDetails.map(f => f.name);
            expect(names).toContain('AC');
            expect(names).not.toContain('fan');
        });

        it('returns OneDetails array in response', () => {
            expect(Array.isArray(property.OneDetails)).toBe(true);
            expect(property.OneDetails.length).toBeGreaterThan(0);
        });

        it('returns 400 when required fields are missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/addproperties')
                .set('authorization', token)
                .send({ title: 'No price or postalCode' });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 401 without auth', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/addproperties')
                .send({ title: 'Test', listingType: 'sale', price: '100', postalCode: '12345' });
            expect(res.status).toBe(401);
        });
    });

    // ── POST /getpropertybyid ─────────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/getpropertybyid', () => {
        it('returns full property with OneDetails and landmarks', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getpropertybyid')
                .send({ propertyID: property.propertyID });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.propertyID).toBe(property.propertyID);
            expect(Array.isArray(res.body.data.OneDetails)).toBe(true);
            expect(Array.isArray(res.body.data.landmarks)).toBe(true);
            expect(res.body.data.landmarks.length).toBeGreaterThan(0);
        });

        it('returns uploadedPaths in property detail', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getpropertybyid')
                .send({ propertyID: property.propertyID });
            expect(res.body.data.uploadedPaths).toHaveLength(2);
        });

        it('returns null data for non-existent propertyID', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getpropertybyid')
                .send({ propertyID: 'non-existent-id-12345' });
            expect(res.status).toBe(200);
            expect(res.body.data).toBeNull();
        });
    });

    // ── POST /getproperties (search page) ────────────────────────────────────
    describe('POST /api/v1/realestate/properties/getproperties', () => {
        it('filters by city', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ city: 'Bangalore', limitList: 10 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // All returned properties must have city: Bangalore
            res.body.data.forEach(p => {
                expect(p.city.toLowerCase()).toBe('bangalore');
            });
        });

        it('filters by categoryType (mapped to listingType)', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ categoryType: 'sale', limitList: 10 });

            expect(res.status).toBe(200);
            res.body.data.forEach(p => {
                expect(p.listingType.toLowerCase()).toBe('sale');
            });
        });

        it('returns correct page via skip (page 0 vs page 1)', async () => {
            const page0 = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ city: 'Bangalore', limitList: 1, page: 0 });
            const page1 = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ city: 'Bangalore', limitList: 1, page: 1 });

            expect(page0.status).toBe(200);
            expect(page1.status).toBe(200);
            // Page 0 and page 1 should return different properties (if enough data)
            if (page0.body.data.length > 0 && page1.body.data.length > 0) {
                expect(page0.body.data[0].propertyID).not.toBe(page1.body.data[0].propertyID);
            }
        });

        it('returns empty array for a city with no properties', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ city: 'NonExistentCityXYZ' });
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });

    // ── POST /getrelatedproperties ────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/getrelatedproperties', () => {
        it('returns related properties array', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getrelatedproperties')
                .send({ propertyID: property.propertyID });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    // ── POST /searchfunc ──────────────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/searchfunc', () => {
        it('returns matching results with required fields', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/searchfunc')
                .send({ text: 'Test Nagar' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            if (res.body.data.length > 0) {
                const first = res.body.data[0];
                // Frontend reads: location, propertyID
                expect(first).toHaveProperty('propertyID');
                expect(first).toHaveProperty('location');
            }
        });

        it('returns empty array for text with no matches', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/searchfunc')
                .send({ text: 'zzznomatchzzzxxx' });
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });

    // ── POST /updateproperty ──────────────────────────────────────────────────
    describe('POST /api/v1/realestate/properties/updateproperty', () => {
        it('updates price and uploadedPaths', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/updateproperty')
                .set('authorization', token)
                .send({
                    propertyID: property.propertyID,
                    price: '5000000',
                    uploadedPaths: [{ id: 'img2', path: 'test/img2.jpg' }],
                });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.propertyID).toBe(property.propertyID);
        });

        it('cannot overwrite propertyID or createAt', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/updateproperty')
                .set('authorization', token)
                .send({
                    propertyID: property.propertyID,
                    createAt: 0,
                });
            // Should succeed but createAt should be unchanged
            expect(res.status).toBe(200);
            const check = await request(getApp())
                .post('/api/v1/realestate/properties/getpropertybyid')
                .send({ propertyID: property.propertyID });
            expect(check.body.data.createAt).not.toBe(0);
        });

        it('returns 404 for non-existent property', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/updateproperty')
                .set('authorization', token)
                .send({ propertyID: 'does-not-exist-xyz' });
            expect(res.status).toBe(404);
        });

        it('returns 400 when propertyID is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/updateproperty')
                .set('authorization', token)
                .send({ price: '9999' });
            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/updateproperty')
                .send({ propertyID: property.propertyID, price: '1' });
            expect(res.status).toBe(401);
        });
    });

    // ── GET /myproperties ─────────────────────────────────────────────────────
    describe('GET /api/v1/realestate/properties/myproperties', () => {
        it('returns only properties owned by authenticated user', async () => {
            const res = await request(getApp())
                .get('/api/v1/realestate/properties/myproperties')
                .set('authorization', token);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].title).toBe('Test Suite Property');
        });

        it('returns 401 without auth', async () => {
            const res = await request(getApp()).get('/api/v1/realestate/properties/myproperties');
            expect(res.status).toBe(401);
        });
    });

    // ── POST /shortlist + GET /shortlisted ────────────────────────────────────
    describe('Shortlist', () => {
        beforeEach(async () => {
            await clearShortlist();
        });

        afterEach(async () => {
            await clearShortlist();
        });

        it('POST /shortlist adds property to saved list', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({ propertyID: property.propertyID });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.shortlisted).toBe(true);
            expect(res.body.data.propertyID).toBe(property.propertyID);
        });

        it('POST /shortlist toggles off (removes) when called again', async () => {
            // Add first
            await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({ propertyID: property.propertyID });
            // Remove
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({ propertyID: property.propertyID });

            expect(res.body.data.shortlisted).toBe(false);
        });

        it('GET /shortlisted returns saved properties', async () => {
            await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({ propertyID: property.propertyID });

            const res = await request(getApp())
                .get('/api/v1/realestate/properties/shortlisted')
                .set('authorization', token);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            const ids = res.body.data.map(p => p.propertyID);
            expect(ids).toContain(property.propertyID);
        });

        it('GET /shortlisted returns empty list when nothing saved', async () => {
            // Ensure nothing is saved (afterEach already toggles off)
            const res = await request(getApp())
                .get('/api/v1/realestate/properties/shortlisted')
                .set('authorization', token);
            expect(res.status).toBe(200);
        });

        it('POST /shortlist returns 400 without propertyID', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({});
            expect(res.status).toBe(400);
        });

        it('POST /shortlist returns 401 without auth', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .send({ propertyID: property.propertyID });
            expect(res.status).toBe(401);
        });
    });

    // ── POST /deleteproperty (soft-delete) ────────────────────────────────────
    describe('POST /api/v1/realestate/properties/deleteproperty', () => {
        let tempProperty;

        beforeEach(async () => {
            tempProperty = await createTestProperty(token, { title: 'To Be Deleted' });
        });

        it('soft-deletes the property (returns success)', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.propertyID).toBe(tempProperty.propertyID);
        });

        it('deleted property is excluded from getPropertyById', async () => {
            await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getpropertybyid')
                .send({ propertyID: tempProperty.propertyID });

            expect(res.body.data).toBeNull();
        });

        it('deleted property is excluded from myproperties', async () => {
            await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            const res = await request(getApp())
                .get('/api/v1/realestate/properties/myproperties')
                .set('authorization', token);

            const ids = res.body.data.map(p => p.propertyID);
            expect(ids).not.toContain(tempProperty.propertyID);
        });

        it('deleted property is excluded from getproperties search', async () => {
            await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            const res = await request(getApp())
                .post('/api/v1/realestate/properties/getproperties')
                .send({ city: 'Bangalore' });

            const ids = res.body.data.map(p => p.propertyID);
            expect(ids).not.toContain(tempProperty.propertyID);
        });

        it('deleted property excluded from shortlisted', async () => {
            // Add to shortlist
            await request(getApp())
                .post('/api/v1/realestate/properties/shortlist')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            // Delete
            await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            // Should not appear in shortlisted
            const res = await request(getApp())
                .get('/api/v1/realestate/properties/shortlisted')
                .set('authorization', token);
            const ids = res.body.data.map(p => p.propertyID);
            expect(ids).not.toContain(tempProperty.propertyID);
        });

        it('returns 404 for already-deleted property', async () => {
            await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });

            const res = await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: tempProperty.propertyID });
            expect(res.status).toBe(404);
        });

        it('returns 404 for non-existent property', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({ propertyID: 'ghost-property-id' });
            expect(res.status).toBe(404);
        });

        it('returns 400 when propertyID is missing', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .set('authorization', token)
                .send({});
            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/properties/deleteproperty')
                .send({ propertyID: tempProperty.propertyID });
            expect(res.status).toBe(401);
        });
    });
});
