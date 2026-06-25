'use strict';
const { loginSchema } = require('../validators/auth.validator');

describe('loginSchema', () => {
    it('passes with valid email and password', () => {
        const result = loginSchema.safeParse({ userName: 'test@test.com', password: 'password123' });
        expect(result.success).toBe(true);
    });

    it('fails when body is empty', () => {
        const result = loginSchema.safeParse({});
        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(2);
    });

    it('fails when userName is not a valid email', () => {
        const result = loginSchema.safeParse({ userName: 'notanemail', password: 'password123' });
        expect(result.success).toBe(false);
        const issue = result.error.issues.find(i => i.path[0] === 'userName');
        expect(issue).toBeDefined();
        expect(issue.message).toBe('Must be a valid email');
    });

    it('fails when password is shorter than 6 characters', () => {
        const result = loginSchema.safeParse({ userName: 'test@test.com', password: '123' });
        expect(result.success).toBe(false);
        const issue = result.error.issues.find(i => i.path[0] === 'password');
        expect(issue).toBeDefined();
    });

    it('fails when userName is missing', () => {
        const result = loginSchema.safeParse({ password: 'password123' });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe('userName');
    });

    it('strips unknown fields from the parsed output', () => {
        const result = loginSchema.safeParse({ userName: 'test@test.com', password: 'password123', extra: 'ignored' });
        expect(result.success).toBe(true);
        expect(result.data.extra).toBeUndefined();
    });
});
