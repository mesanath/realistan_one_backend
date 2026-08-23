'use strict';
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SIG || 'test_jwt_secret_for_testing_only';

const generateToken = (overrides = {}) =>
    jwt.sign(
        {
            userID: 'user123',
            role: 'Product',
            readAccess: ['User', 'Articles', 'Inquiries', 'InquiryStatus', 'AdminConsoleUsers'],
            writeAccess: ['User', 'Articles', 'Inquiries', 'InquiryStatus', 'AdminConsoleUsers'],
            ...overrides,
        },
        SECRET
    );

const generateReadOnlyToken = () => generateToken({ writeAccess: [] });
const generateNoAccessToken = () => generateToken({ readAccess: [], writeAccess: [] });

module.exports = { generateToken, generateReadOnlyToken, generateNoAccessToken };
