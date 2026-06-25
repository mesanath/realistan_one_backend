'use strict';
const { z } = require('zod');

const ACCESS_LEVELS = z.array(z.enum(['User', 'Articles'])).optional().default([]);

exports.getAdminListSchema = z.object({
    type: z.enum(['list', 'edit'], { required_error: 'type is required', invalid_type_error: 'type must be "list" or "edit"' }),
    userID: z.string().optional(),
}).refine(
    data => data.type !== 'edit' || !!data.userID,
    { message: 'userID is required when type is "edit"', path: ['userID'] }
);

exports.addAdminUserSchema = z.object({
    email: z.string({ required_error: 'email is required' }).email('Must be a valid email'),
    authername: z.string({ required_error: 'authername is required' })
        .min(3, 'authername must be at least 3 characters')
        .max(50, 'authername must be at most 50 characters'),
    password: z.string({ required_error: 'password is required' }).min(6, 'Password must be at least 6 characters'),
    readAccess: ACCESS_LEVELS,
    writeAccess: ACCESS_LEVELS,
});

exports.editAdminUserSchema = z.object({
    email: z.string({ required_error: 'email is required' }).email('Must be a valid email'),
    authername: z.string({ required_error: 'authername is required' })
        .min(3, 'authername must be at least 3 characters')
        .max(50, 'authername must be at most 50 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    readAccess: ACCESS_LEVELS,
    writeAccess: ACCESS_LEVELS,
});

exports.userIDParamSchema = z.object({
    userID: z.string({ required_error: 'userID param is required' }).min(1, 'userID cannot be empty'),
});
