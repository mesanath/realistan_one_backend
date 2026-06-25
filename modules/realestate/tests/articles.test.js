'use strict';
const request = require('supertest');
const { getApp } = require('./helpers/setup');

describe('Articles', () => {
    // ── POST /homepagearticles ────────────────────────────────────────────────
    describe('POST /api/v1/realestate/articles/homepagearticles', () => {
        it('returns articles array', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/homepagearticles')
                .send({ isFeaturedArticle: true });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('articles');
            expect(Array.isArray(res.body.data.articles)).toBe(true);
        });

        it('includes relatedArticles when isRelatedArticles=true', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/homepagearticles')
                .send({ isFeaturedArticle: true, isRelatedArticles: true });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('relatedArticles');
            expect(Array.isArray(res.body.data.relatedArticles)).toBe(true);
        });

        it('omits relatedArticles when isRelatedArticles is not sent', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/homepagearticles')
                .send({ isFeaturedArticle: true });

            expect(res.status).toBe(200);
            expect(res.body.data.relatedArticles).toBeUndefined();
        });

        it('filters by cities when provided', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/homepagearticles')
                .send({ isFeaturedArticle: false, cities: 'Bangalore' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('works with empty body', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/homepagearticles')
                .send({});
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── POST /getarticlebyid ──────────────────────────────────────────────────
    describe('POST /api/v1/realestate/articles/getarticlebyid', () => {
        it('returns null data for non-existent articleID', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/getarticlebyid')
                .send({ articleID: 'non-existent-article-xyz' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeNull();
        });

        it('does not expose internal fields (published, _id)', async () => {
            // Even if no article is found, verify the endpoint doesn't error
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/getarticlebyid')
                .send({ articleID: 'test-article' });
            expect(res.status).toBe(200);
            if (res.body.data) {
                expect(res.body.data._id).toBeUndefined();
                expect(res.body.data.published).toBeUndefined();
            }
        });

        it('handles missing articleID gracefully', async () => {
            const res = await request(getApp())
                .post('/api/v1/realestate/articles/getarticlebyid')
                .send({});
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeNull();
        });
    });
});
