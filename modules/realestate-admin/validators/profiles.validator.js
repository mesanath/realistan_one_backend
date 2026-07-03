'use strict';
const { z } = require('zod');

exports.addProfileSchema = z.object({
    name: z.string({ required_error: 'name is required' }).min(1, 'name cannot be empty'),
    email: z.string().email('Must be a valid email').optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().url('profileImage must be a valid URL').optional(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.editProfileSchema = z.object({
    name: z.string().min(1, 'name cannot be empty').optional(),
    email: z.string().email('Must be a valid email').optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().url('profileImage must be a valid URL').optional(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.profileIDParamSchema = z.object({
    profileID: z.string({ required_error: 'profileID param is required' }).min(1, 'profileID cannot be empty'),
});
