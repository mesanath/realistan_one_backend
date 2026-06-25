'use strict';
const jwt = require('jsonwebtoken');
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');

const SECRET = process.env.JWT_SIG;

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('authenticate', () => {
    it('returns 401 when Authorization header is missing', () => {
        const req = { headers: {}, cookies: {} };
        const res = mockRes();
        authenticate(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authorization missing' }));
    });

    it('returns 401 when token is invalid', () => {
        const req = { headers: { authorization: 'Bearer invalidtoken' }, cookies: {} };
        const res = mockRes();
        authenticate(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid or expired token' }));
    });

    it('attaches decoded user to req and calls next on valid token', () => {
        const payload = { userID: 'u1', role: 'Product', readAccess: ['User'], writeAccess: ['User'] };
        const token = jwt.sign(payload, SECRET);
        const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
        const res = mockRes();
        const next = jest.fn();
        authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toMatchObject({ userID: 'u1' });
    });

    it('reads token from authToken cookie when no Authorization header', () => {
        const payload = { userID: 'u1', readAccess: ['User'], writeAccess: [] };
        const token = jwt.sign(payload, SECRET);
        const req = { headers: {}, cookies: { authToken: token } };
        const res = mockRes();
        const next = jest.fn();
        authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.userID).toBe('u1');
    });

    it('prefers cookie token over Authorization header', () => {
        const cookiePayload = { userID: 'cookie_user', readAccess: [], writeAccess: [] };
        const cookieToken = jwt.sign(cookiePayload, SECRET);
        const headerToken = jwt.sign({ userID: 'header_user', readAccess: [], writeAccess: [] }, SECRET);
        const req = {
            headers: { authorization: `Bearer ${headerToken}` },
            cookies: { authToken: cookieToken },
        };
        const res = mockRes();
        const next = jest.fn();
        authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.userID).toBe('cookie_user');
    });
});

describe('requireAccess', () => {
    const makeReqWithAccess = (readAccess, writeAccess) => ({
        user: { readAccess, writeAccess },
    });

    it('calls next when user has required read access', () => {
        const req = makeReqWithAccess(['User', 'Articles'], []);
        const res = mockRes();
        const next = jest.fn();
        requireAccess('User', 'read')(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('calls next when user has required write access', () => {
        const req = makeReqWithAccess([], ['Articles']);
        const res = mockRes();
        const next = jest.fn();
        requireAccess('Articles', 'write')(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user is missing the required read access', () => {
        const req = makeReqWithAccess([], []);
        const res = mockRes();
        requireAccess('User', 'read')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when user is missing the required write access', () => {
        const req = makeReqWithAccess(['User'], []);
        const res = mockRes();
        requireAccess('Articles', 'write')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 when req.user is not set', () => {
        const req = {};
        const res = mockRes();
        requireAccess('User', 'read')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
