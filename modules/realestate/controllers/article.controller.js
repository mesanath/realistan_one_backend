'use strict';
const { db } = require('../../../src/utils/dbs');

exports.getHomepageArticles = async (req, res) => {
    try {
        const { isFeaturedArticle, cities, isRelatedArticles } = req.body;

        const findFinal = { published: true, deleted: { $exists: false }, isFeaturedArticle: true };
        if (isFeaturedArticle) findFinal.isFeaturedArticle = true;
        if (cities) findFinal.cities = { $in: [cities] };

        const projection = { projection: { content: 0, tags: 0, updatedAt: 0, publishedType: 0, publishedAt: 0, published: 0, _id: 0 } };
        const sortQuery = { updatedAt: -1 };
        const articlesDB = db.get().collection('articles');

        const articles = await articlesDB.find(findFinal, projection).sort(sortQuery).limit(10).toArray();
        const data = { articles };

        if (isRelatedArticles) {
            const articleIDs = articles.map(item => item.articleID);
            data.relatedArticles = await articlesDB
                .find({ articleID: { $nin: articleIDs } }, projection)
                .sort(sortQuery)
                .limit(10)
                .toArray();
        }

        return res.json({ success: true, message: 'Articles fetched successfully!', data });
    } catch (error) {
        console.error('getHomepageArticles error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getArticleById = async (req, res) => {
    try {
        const { articleID } = req.body;
        const articlesDB = db.get().collection('articles');
        const data = await articlesDB.findOne(
            { articleID },
            { projection: { published: 0, publishedAt: 0, updatedAt: 0, publishedType: 0, _id: 0 } }
        );

        return res.json({ success: true, message: 'Article fetched successfully!', data });
    } catch (error) {
        console.error('getArticleById error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};
