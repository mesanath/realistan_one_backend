'use strict';
const { getAdminListSchema, addAdminUserSchema, editAdminUserSchema } = require('../validators/admin.validator');

describe('getAdminListSchema', () => {
    it('passes with type=list', () => {
        expect(getAdminListSchema.safeParse({ type: 'list' }).success).toBe(true);
    });

    it('passes with type=edit and userID', () => {
        expect(getAdminListSchema.safeParse({ type: 'edit', userID: 'u123' }).success).toBe(true);
    });

    it('fails with an invalid type value', () => {
        const result = getAdminListSchema.safeParse({ type: 'invalid' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('type');
    });

    it('fails when type=edit but userID is missing', () => {
        const result = getAdminListSchema.safeParse({ type: 'edit' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('userID');
    });

    it('fails when type is missing', () => {
        const result = getAdminListSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe('addAdminUserSchema', () => {
    const valid = { email: 'test@test.com', authername: 'validuser', password: 'password123' };

    it('passes with all required fields', () => {
        expect(addAdminUserSchema.safeParse(valid).success).toBe(true);
    });

    it('passes with optional access arrays', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, readAccess: ['User'], writeAccess: ['Articles'] });
        expect(result.success).toBe(true);
        expect(result.data.readAccess).toEqual(['User']);
    });

    it('defaults readAccess and writeAccess to empty arrays when omitted', () => {
        const result = addAdminUserSchema.safeParse(valid);
        expect(result.success).toBe(true);
        expect(result.data.readAccess).toEqual([]);
        expect(result.data.writeAccess).toEqual([]);
    });

    it('fails when email is invalid', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, email: 'bademail' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('email');
    });

    it('fails when authername is shorter than 3 characters', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, authername: 'ab' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('authername');
    });

    it('fails when authername exceeds 50 characters', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, authername: 'a'.repeat(51) });
        expect(result.success).toBe(false);
    });

    it('fails when readAccess contains an invalid level', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, readAccess: ['InvalidLevel'] });
        expect(result.success).toBe(false);
    });
});

describe('editAdminUserSchema', () => {
    const valid = { email: 'test@test.com', authername: 'validuser' };

    it('passes without password (optional)', () => {
        expect(editAdminUserSchema.safeParse(valid).success).toBe(true);
    });

    it('passes with a new valid password', () => {
        expect(editAdminUserSchema.safeParse({ ...valid, password: 'newpassword' }).success).toBe(true);
    });

    it('fails when password is provided but too short', () => {
        const result = editAdminUserSchema.safeParse({ ...valid, password: '123' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('password');
    });
});
