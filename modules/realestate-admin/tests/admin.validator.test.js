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

    it('passes with valid realistanRole and serveeaseRole', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, realistanRole: 'operations', serveeaseRole: 'customer_services_management' });
        expect(result.success).toBe(true);
        expect(result.data.realistanRole).toBe('operations');
        expect(result.data.serveeaseRole).toBe('customer_services_management');
    });

    it('passes with roles omitted (no access in either product)', () => {
        const result = addAdminUserSchema.safeParse(valid);
        expect(result.success).toBe(true);
        expect(result.data.realistanRole).toBeUndefined();
        expect(result.data.serveeaseRole).toBeUndefined();
    });

    it('passes with roles explicitly null', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, realistanRole: null, serveeaseRole: null });
        expect(result.success).toBe(true);
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

    it('fails when realistanRole is not a known role', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, realistanRole: 'superuser' });
        expect(result.success).toBe(false);
    });

    it('fails when serveeaseRole is not a known role', () => {
        const result = addAdminUserSchema.safeParse({ ...valid, serveeaseRole: 'superuser' });
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
