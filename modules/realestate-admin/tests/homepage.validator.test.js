'use strict';
const { addCategorySchema } = require('../validators/homepage.validator');

describe('addCategorySchema', () => {
    it('passes with a valid catname', () => {
        expect(addCategorySchema.safeParse({ catname: 'Luxury Villas' }).success).toBe(true);
    });

    it('fails when catname is missing', () => {
        const result = addCategorySchema.safeParse({});
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('catname');
    });

    it('fails when catname is an empty string', () => {
        const result = addCategorySchema.safeParse({ catname: '' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('catname');
    });

    it('fails when catname exceeds 100 characters', () => {
        const result = addCategorySchema.safeParse({ catname: 'A'.repeat(101) });
        expect(result.success).toBe(false);
    });

    it('passes when catname is exactly 100 characters', () => {
        expect(addCategorySchema.safeParse({ catname: 'A'.repeat(100) }).success).toBe(true);
    });
});
