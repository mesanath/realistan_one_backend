'use strict';
const { z } = require('zod');
const validate = require('../../../src/middleware/validate.middleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().int().positive('Age must be positive'),
});

describe('validate middleware', () => {
    it('calls next and replaces req.body with parsed data on valid input', () => {
        const req = { body: { name: 'John', age: 25, extra: 'stripped' } };
        const res = mockRes();
        const next = jest.fn();
        validate(schema)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ name: 'John', age: 25 });
        expect(req.body.extra).toBeUndefined();
    });

    it('returns 400 with error array on invalid input', () => {
        const req = { body: {} };
        const res = mockRes();
        validate(schema)(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.arrayContaining([
                    expect.objectContaining({ field: 'name', message: expect.any(String) }),
                ]),
            })
        );
    });

    it('includes all field errors in the response', () => {
        const req = { body: {} };
        const res = mockRes();
        validate(schema)(req, res, jest.fn());
        const { errors } = res.json.mock.calls[0][0];
        expect(errors.length).toBe(2);
    });

    it('validates req.query when source is "query"', () => {
        const querySchema = z.object({ type: z.enum(['list', 'edit']) });
        const req = { query: { type: 'invalid' } };
        const res = mockRes();
        validate(querySchema, 'query')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('validates req.params when source is "params"', () => {
        const paramSchema = z.object({ id: z.string().min(1) });
        const req = { params: { id: '' } };
        const res = mockRes();
        validate(paramSchema, 'params')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
