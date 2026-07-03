'use strict';
const { z } = require('zod');

exports.addPincodeSchema = z.object({
    pincode: z.string({ required_error: 'pincode is required' }).length(6, 'pincode must be exactly 6 digits'),
    area: z.string({ required_error: 'area is required' }).min(1, 'area cannot be empty'),
    city: z.string({ required_error: 'city is required' }).min(1, 'city cannot be empty'),
    state: z.string({ required_error: 'state is required' }).min(1, 'state cannot be empty'),
    country: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.editPincodeSchema = z.object({
    pincode: z.string().length(6, 'pincode must be exactly 6 digits').optional(),
    area: z.string().min(1, 'area cannot be empty').optional(),
    city: z.string().min(1, 'city cannot be empty').optional(),
    state: z.string().min(1, 'state cannot be empty').optional(),
    country: z.string().optional(),
    isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.pincodeIDParamSchema = z.object({
    pincodeID: z.string({ required_error: 'pincodeID param is required' }).min(1, 'pincodeID cannot be empty'),
});
