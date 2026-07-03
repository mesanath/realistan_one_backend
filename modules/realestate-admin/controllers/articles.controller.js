'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

const stringToSlug = (str) => {
    str = str.replace(/^\s+|\s+$/g, '').toLowerCase();
    const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
    const to   = 'aaaaeeeeiiiioooouuuunc------';
    for (let i = 0; i < from.length; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
};

exports.getArticlesList = async (req, res, next) => {
    try {
        const { status } = req.query;
        const db = connectToDatabase();
        const articlesDB = db.collection('articles');
        const filter = status ? { status } : {};
        const data = await articlesDB.find(filter).toArray();
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.getArticleDetails = async (req, res, next) => {
    try {
        const { articleID } = req.params;
        const db = connectToDatabase();
        const articlesDB = db.collection('articles');
        const data = await articlesDB.findOne({ articleID });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }
        return res.json({ success: true, data });
    } catch (e) {
        next(e);
    }
};

exports.addArticle = async (req, res, next) => {
    try {
        const args = req.body;
        const db = connectToDatabase();
        const articlesDB = db.collection('articles');
        const currentTimestamp = +new Date();
        const articleID = `${stringToSlug(args.title)}-${currentTimestamp}`;
        const slug = stringToSlug(args.title);
        const now = new Date().valueOf();
        await articlesDB.insertOne({
            ...args,
            articleID,
            slug,
            createdAt: now,
            updatedAt: now,
        });
        return res.json({ success: true, message: 'Article created successfully', articleID });
    } catch (e) {
        next(e);
    }
};

exports.editArticle = async (req, res, next) => {
    try {
        const { articleID } = req.params;
        const updateObj = { ...req.body, updatedAt: new Date().valueOf() };
        delete updateObj.articleID;
        if (updateObj.title) {
            updateObj.slug = stringToSlug(updateObj.title);
        }
        const db = connectToDatabase();
        const articlesDB = db.collection('articles');
        await articlesDB.updateOne({ articleID }, { $set: updateObj });
        return res.json({ success: true, message: 'Article updated successfully' });
    } catch (e) {
        next(e);
    }
};

exports.deleteArticle = async (req, res, next) => {
    try {
        const { articleID } = req.params;
        const db = connectToDatabase();
        const articlesDB = db.collection('articles');
        await articlesDB.deleteOne({ articleID });
        return res.json({ success: true, message: 'Article deleted successfully' });
    } catch (e) {
        next(e);
    }
};
