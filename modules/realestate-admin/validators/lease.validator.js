'use strict';
const { z } = require('zod');

exports.addLeaseSchema = z.object({
    title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
    propertyType: z.string({ required_error: 'propertyType is required' }).min(1, 'propertyType cannot be empty'),
    location: z.string({ required_error: 'location is required' }).min(1, 'location cannot be empty'),
    city: z.string().optional(),
    price: z.string().optional(),
    duration: z.string().optional(),
    availableFrom: z.string().optional(),
    description: z.string().optional(),
    images: z.array(z.string()).optional(),
    status: z.enum(['available', 'leased', 'pending']).optional(),
});

exports.editLeaseSchema = z.object({
    title: z.string().min(1, 'title cannot be empty').optional(),
    propertyType: z.string().min(1, 'propertyType cannot be empty').optional(),
    location: z.string().min(1, 'location cannot be empty').optional(),
    city: z.string().optional(),
    price: z.string().optional(),
    duration: z.string().optional(),
    availableFrom: z.string().optional(),
    description: z.string().optional(),
    images: z.array(z.string()).optional(),
    status: z.enum(['available', 'leased', 'pending']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.leaseIDParamSchema = z.object({
    leaseID: z.string({ required_error: 'leaseID param is required' }).min(1, 'leaseID cannot be empty'),
});
