'use strict';
const { z } = require('zod');
const { BANNER_PLACEMENTS } = require('../../../constants/bannerPlacements');

// ─── Banners (generic CTA banners) ─────────────────────────────────────────────
// Field names match what the admin panel's Banner form actually collects
// (src/Components/banners/create.js buildBannerPayload) — previously this schema
// required `image` as a full URL and had no home for subtitle/description/ctaText,
// so every admin create/edit call failed validation. `imageUrl` is the S3 key
// returned by the upload lambda (see project image-upload pattern), not a full URL.

exports.addBannerSchema = z.object({
    title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
    imageUrl: z.string({ required_error: 'imageUrl is required' }).min(1, 'imageUrl cannot be empty'),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    bannerType: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.editBannerSchema = z.object({
    title: z.string().min(1, 'title cannot be empty').optional(),
    imageUrl: z.string().min(1, 'imageUrl cannot be empty').optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    bannerType: z.string().optional(),
    isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.bannerIDParamSchema = z.object({
    bannerID: z.string({ required_error: 'bannerID param is required' }).min(1, 'bannerID cannot be empty'),
});

// ─── Feature / Image Banners (home-page placements) ───────────────────────────
// Field names match src/Components/banners/imagebanners.js — previously this
// schema required `url` (a full URL) and `label`, and had no `placement`, so
// every admin upload here failed validation too, and there was no home for the
// admin's `category` choice at all.

exports.addBannerImageSchema = z.object({
    title: z.string().optional(),
    placement: z.enum(BANNER_PLACEMENTS, {
        required_error: 'placement is required',
        invalid_type_error: `placement must be one of: ${BANNER_PLACEMENTS.join(', ')}`,
    }),
    imageUrl: z.string({ required_error: 'imageUrl is required' }).min(1, 'imageUrl cannot be empty'),
    link: z.string().optional(),
    isActive: z.boolean().optional(),
});

exports.editBannerImageSchema = z.object({
    title: z.string().optional(),
    placement: z.enum(BANNER_PLACEMENTS).optional(),
    imageUrl: z.string().min(1, 'imageUrl cannot be empty').optional(),
    link: z.string().optional(),
    isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.imageIDParamSchema = z.object({
    imageID: z.string({ required_error: 'imageID param is required' }).min(1, 'imageID cannot be empty'),
});
