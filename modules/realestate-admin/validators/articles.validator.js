'use strict';
const { z } = require('zod');

exports.addArticleSchema = z.object({
    title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
    content: z.string({ required_error: 'content is required' }).min(1, 'content cannot be empty'),
    authorname: z.string({ required_error: 'authorname is required' }).min(1, 'authorname cannot be empty'),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    status: z.enum(['draft', 'published']).optional(),
});

exports.editArticleSchema = z.object({
    title: z.string().min(1, 'title cannot be empty').optional(),
    content: z.string().min(1, 'content cannot be empty').optional(),
    authorname: z.string().min(1, 'authorname cannot be empty').optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    status: z.enum(['draft', 'published']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.articleIDParamSchema = z.object({
    articleID: z.string().min(1, 'articleID cannot be empty'),
});
