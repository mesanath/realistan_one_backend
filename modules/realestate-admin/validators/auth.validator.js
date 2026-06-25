'use strict';
const { z } = require('zod');

exports.loginSchema = z.object({
    userName: z.string({ required_error: 'userName is required' }).email('Must be a valid email'),
    password: z.string({ required_error: 'password is required' }).min(6, 'Password must be at least 6 characters'),
});
