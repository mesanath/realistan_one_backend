const { getCollection } = require('../../services');

class MongoAPI {
  /**
   * @param {string} name collection name
   */
  constructor(name) {
    this.collection = getCollection(name);
  }

  /**
   * Fetches the first document that matches the filter
   * @param {import('mongodb').Filter<Document>} query Query for find Operation
   * @param {import('mongodb').FindOptions<Document>} options Optional settings for the command
   * @returns
   */
  findOne(query, options) {
    return this.collection.findOne(query, options);
  }

  /**
   *
   * @param {import('mongodb').Filter<Document>} filter
   * @param {import('mongodb').FindOptions<Document>} options
   * @returns {import('mongodb').FindCursor<import('mongodb').WithId<Document>>}
   */
  find(filter = {}, options) {
    return this.collection.find(filter, options);
  }
  /**
   *
   * @param {Document} filter
   * @param {import('mongodb').CountDocumentsOptions} options
   * @returns
   */
  countDocuments(filter, options) {
    return this.collection.countDocuments(filter, options);
  }
  /**
   * Update a single document in a collection
   * @param {import('mongodb').Filter<Document>} filter The filter used to select the document to update
   * @param {import('mongodb').UpdateFilter<Document> | Partial<Document>} update The update operations to be applied to the document
   * @param {import('mongodb').UpdateOptions | undefined} options Optional settings for the command
   * @returns
   */
  updateOne(filter, update, options) {
    return this.collection.updateOne(filter, update, options);
  }
  /**
   * Inserts a single document into MongoDB. If documents passed in do not contain the _id field, one will be added to each of the documents missing it by the driver, mutating the document. This behavior can be overridden by setting the forceServerObjectId flag.
   * @param {import('mongodb').OptionalId<Document>} doc The document to insert
   * @param {import('mongodb').InsertOneOptions | undefined} options Optional settings for the command
   * @returns
   */
  insertOne(doc, options) {
    return this.collection.insertOne(doc, options);
  }
  /**
   * Delete a document from a collection
   * @param {import('mongodb').Filter<Document>} filter The filter used to select the document to remove
   * @param {import('mongodb').DeleteOptions | undefined} options Optional settings for the command
   * @returns
   */

  deleteOne(filter, options) {
    return this.collection.deleteOne(filter, options);
  }
  /**
   * Find a document and update it in one atomic operation. Requires a write lock for the duration of the operation.
   * @param {import('mongodb').Filter<Document>} filter The filter used to select the document to update
   * @param {import('mongodb').UpdateFilter<Document>} update Update operations to be performed on the document
   * @param {import('mongodb').FindOneAndUpdateOptions | undefined} options  Optional settings for the command
   * @returns
   */
  findOneAndUpdate(filter, update, options) {
    return this.collection.findOneAndUpdate(filter, update, options);
  }

  /**
   * Update a single document in a collection
   * @param {import('mongodb').Filter<Document>} filter The filter used to select the document to update
   * @param {import('mongodb').UpdateFilter<Document> | Partial<Document>} update The update operations to be applied to the document
   * @param {import('mongodb').UpdateOptions | undefined} options Optional settings for the command
   * @returns
   */
  updateMany(filter, update, options) {
    return this.collection.updateMany(filter, update, options);
  }
  /**
   * Perform a bulkWrite operation without a fluent API
   *
   * Legal operation types are
   * - `insertOne`
   * - `replaceOne`
   * - `updateOne`
   * - `updateMany`
   * - `deleteOne`
   * - `deleteMany`
   *
   * If documents passed in do not contain the **_id** field,
   * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
   * can be overridden by setting the **forceServerObjectId** flag.
   *
   * @param {import('mongodb').AnyBulkWriteOperation<Document>[]} operations Bulk operations to perform
   * @param {import('mongodb').BulkWriteOptions | undefined} options Optional settings for the command
   */
  bulkWrite(operations, options) {
    this.collection.bulkWrite(operations, options);
  }
}

module.exports = {
  MongoAPI,
};
