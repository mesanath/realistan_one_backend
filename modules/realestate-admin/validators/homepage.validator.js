'use strict';
const { z } = require('zod');

exports.addCategorySchema = z.object({
    catname: z.string({ required_error: 'catname is required' }).min(1, 'catname cannot be empty').max(100, 'catname must be at most 100 characters'),
});
