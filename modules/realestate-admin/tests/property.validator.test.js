'use strict';
const { addPropertySchema, editPropertySchema } = require('../validators/property.validator');

const validProperty = {
    title: '3BHK Apartment',
    listingType: 'Sell',
    houseType: 'Apartment',
    location: 'Mumbai',
    postalCode: '400001',
};

describe('addPropertySchema', () => {
    it('passes with all required fields', () => {
        expect(addPropertySchema.safeParse(validProperty).success).toBe(true);
    });

    it('passes with Rent as listingType', () => {
        expect(addPropertySchema.safeParse({ ...validProperty, listingType: 'Rent' }).success).toBe(true);
    });

    it('fails when title is missing', () => {
        const { title, ...rest } = validProperty;
        const result = addPropertySchema.safeParse(rest);
        expect(result.success).toBe(false);
        expect(result.error.issues.some(i => i.path[0] === 'title')).toBe(true);
    });

    it('fails when listingType is invalid', () => {
        const result = addPropertySchema.safeParse({ ...validProperty, listingType: 'Buy' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('listingType');
    });

    it('fails when all required fields are missing', () => {
        const result = addPropertySchema.safeParse({});
        expect(result.success).toBe(false);
        expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
    });

    it('passes with all optional fields included', () => {
        const result = addPropertySchema.safeParse({
            ...validProperty,
            price: '8500000', city: 'Mumbai', bathsType: '3',
            amenitiesDetails: [{ name: 'Pool', count: 1 }],
            furnishingDetails: [{ name: 'Sofa', count: 2 }],
            uploadedPaths: [{ id: 'img1', path: 'https://example.com/image.jpg' }],
        });
        expect(result.success).toBe(true);
    });
});

describe('editPropertySchema', () => {
    it('fails when body is empty', () => {
        const result = editPropertySchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('passes with at least one field', () => {
        expect(editPropertySchema.safeParse({ price: '9000000' }).success).toBe(true);
    });

    it('passes with multiple optional fields', () => {
        expect(editPropertySchema.safeParse({ price: '9000000', furnishingStatus: 'Furnished', city: 'Delhi' }).success).toBe(true);
    });
});
