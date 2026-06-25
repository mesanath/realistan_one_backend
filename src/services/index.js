'use strict';
const { connectToDatabase, getMany } = require('./databaseConnections');

const getCollection = (name) => connectToDatabase().collection(name);

exports.client = connectToDatabase;
exports.connectToDatabase = connectToDatabase;
exports.getMany = getMany;
exports.getCollection = getCollection;
