'use strict';
const { connectToDatabase } = require('../../../src/services/databaseConnections');

exports.addCategories = async (req, res, next) => {
    try {
        const { catname } = req.body;
        const db = connectToDatabase();
        const homePageCategoriesDB = db.collection('homePageCategories');
        await homePageCategoriesDB.insertOne({ catname, createAt: new Date().valueOf() });
        return res.json({ success: true, message: 'Inserted successfully' });
    } catch (e) {
        next(e);
    }
};
