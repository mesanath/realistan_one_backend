'use strict';

// ─── Feature Banner Placements ─────────────────────────────────────────────────
// Shared between the admin upload contract (modules/realestate-admin/banners) and
// the public home-page feed (modules/realestate/banners) so both sides agree on
// which placements exist and what size each one is expected to be uploaded at.
// Sizes are advisory (enforced client-side in admin, not re-validated here) —
// they exist so the admin upload UI and the client site's layout stay in sync.

const BANNER_PLACEMENTS = ['Hero', 'Sidebar', 'Footer', 'Popup', 'Promotional', 'Feature'];

const BANNER_PLACEMENT_SIZES = {
    Hero:        { width: 1920, height: 600,  aspectRatio: '16/5' },
    Sidebar:     { width: 300,  height: 600,  aspectRatio: '1/2' },
    Footer:      { width: 1920, height: 250,  aspectRatio: '32/5' },
    Popup:       { width: 600,  height: 800,  aspectRatio: '3/4' },
    Promotional: { width: 1200, height: 400,  aspectRatio: '3/1' },
    Feature:     { width: 800,  height: 450,  aspectRatio: '16/9' },
};

module.exports = { BANNER_PLACEMENTS, BANNER_PLACEMENT_SIZES };
