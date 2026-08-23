'use strict';
const { z } = require('zod');
const { REALISTAN_ROLES, SERVEEASE_ROLES } = require('../../../constants/adminRoles');

// readAccess/writeAccess are no longer accepted directly from the client — they're
// computed server-side from realistanRole (see admin.controller.js + constants/
// adminRoles.js) so a caller can't hand-craft an access array to grant themselves
// more than their role allows. realistanRole/serveeaseRole are each optional +
// nullable — an admin user can hold a role in one product, both, or neither.
const REALISTAN_ROLE = z.enum(REALISTAN_ROLES).nullable().optional();
const SERVEEASE_ROLE = z.enum(SERVEEASE_ROLES).nullable().optional();

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
    realistanRole: REALISTAN_ROLE,
    serveeaseRole: SERVEEASE_ROLE,
});

exports.editAdminUserSchema = z.object({
    email: z.string({ required_error: 'email is required' }).email('Must be a valid email'),
    authername: z.string({ required_error: 'authername is required' })
        .min(3, 'authername must be at least 3 characters')
        .max(50, 'authername must be at most 50 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    realistanRole: REALISTAN_ROLE,
    serveeaseRole: SERVEEASE_ROLE,
});

exports.userIDParamSchema = z.object({
    userID: z.string({ required_error: 'userID param is required' }).min(1, 'userID cannot be empty'),
});
