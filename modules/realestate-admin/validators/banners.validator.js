'use strict';
const { z } = require('zod');

exports.addBannerSchema = z.object({
    title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
    image: z.string({ required_error: 'image is required' }).url('image must be a valid URL'),
    link: z.string().url('link must be a valid URL').optional(),
    position: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.editBannerSchema = z.object({
    title: z.string().min(1, 'title cannot be empty').optional(),
    image: z.string().url('image must be a valid URL').optional(),
    link: z.string().url('link must be a valid URL').optional(),
    position: z.string().optional(),
    isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.bannerIDParamSchema = z.object({
    bannerID: z.string({ required_error: 'bannerID param is required' }).min(1, 'bannerID cannot be empty'),
});

exports.addBannerImageSchema = z.object({
    url: z.string({ required_error: 'url is required' }).url('url must be a valid URL'),
    label: z.string().optional(),
    bannerID: z.string().optional(),
});

exports.imageIDParamSchema = z.object({
    imageID: z.string({ required_error: 'imageID param is required' }).min(1, 'imageID cannot be empty'),
});
