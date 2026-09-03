'use strict';
const { z } = require('zod');

exports.addAgentSchema = z.object({
    name: z.string({ required_error: 'name is required' }).min(1, 'name cannot be empty'),
    email: z.string().email('email must be a valid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    city: z.string().optional(),
    agency: z.string().optional(),
    licenseNumber: z.string().optional(),
    profileImage: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

exports.editAgentSchema = z.object({
    name: z.string().min(1, 'name cannot be empty').optional(),
    email: z.string().email('email must be a valid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    city: z.string().optional(),
    agency: z.string().optional(),
    licenseNumber: z.string().optional(),
    profileImage: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.agentIDParamSchema = z.object({
    agentID: z.string({ required_error: 'agentID param is required' }).min(1, 'agentID cannot be empty'),
});
