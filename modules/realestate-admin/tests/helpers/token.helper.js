'use strict';
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SIG || 'test_jwt_secret_for_testing_only';

const generateToken = (overrides = {}) =>
    jwt.sign(
        {
            userID: 'user123',
            role: 'Product',
            readAccess: ['User', 'Articles'],
            writeAccess: ['User', 'Articles'],
            ...overrides,
        },
        SECRET
    );

const generateReadOnlyToken = () => generateToken({ writeAccess: [] });
const generateNoAccessToken = () => generateToken({ readAccess: [], writeAccess: [] });

module.exports = { generateToken, generateReadOnlyToken, generateNoAccessToken };
