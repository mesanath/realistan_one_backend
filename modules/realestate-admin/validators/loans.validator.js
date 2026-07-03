'use strict';
const { z } = require('zod');

exports.addLoanSchema = z.object({
    applicantName: z.string({ required_error: 'applicantName is required' }).min(1, 'applicantName cannot be empty'),
    phone: z.string({ required_error: 'phone is required' }).min(1, 'phone cannot be empty'),
    email: z.string().email('email must be a valid email address').optional(),
    loanType: z.enum(['home', 'mortgage', 'construction', 'other'], {
        required_error: 'loanType is required',
        invalid_type_error: 'loanType must be one of: home, mortgage, construction, other',
    }),
    amount: z.string().optional(),
    tenure: z.string().optional(),
    city: z.string().optional(),
    propertyDetails: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'disbursed']).optional(),
    notes: z.string().optional(),
});

exports.editLoanSchema = z.object({
    applicantName: z.string().min(1, 'applicantName cannot be empty').optional(),
    phone: z.string().min(1, 'phone cannot be empty').optional(),
    email: z.string().email('email must be a valid email address').optional(),
    loanType: z.enum(['home', 'mortgage', 'construction', 'other']).optional(),
    amount: z.string().optional(),
    tenure: z.string().optional(),
    city: z.string().optional(),
    propertyDetails: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'disbursed']).optional(),
    notes: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.loanIDParamSchema = z.object({
    loanID: z.string({ required_error: 'loanID param is required' }).min(1, 'loanID cannot be empty'),
});
