'use strict';
const mongoose = require('mongoose');

// Mongoose model living inside the otherwise-native-driver realestate module — `properties`
// itself stays a plain `db.collection('properties')` (see property.controller.js) and isn't
// touched by this schema. Reuses the process-wide Mongoose connection already opened by
// modules/serveease/config/mongoose.js at server startup (one Mongoose connection, shared by
// every module that wants schema/validation, same as how AgentSkillRequest works in serveease).
//
// Shape/status-enum copied directly from modules/serveease/models/AgentSkillRequest.js — the
// established "agent requests X, admin approves/rejects" pattern in this codebase.
const DOCUMENT_TYPES = ['title_deed', 'encumbrance_certificate', 'rera', 'tax_receipt', 'litigation_search'];

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: DOCUMENT_TYPES, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const propertyVerificationRequestSchema = new mongoose.Schema({
  propertyID: { type: String, required: true, index: true }, // matches properties.propertyID slug
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  documents: { type: [documentSchema], default: [] },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
  // String, not ObjectId — realestate-admin's admin identity (req.user.userID, set by
  // src/adminAuth/adminAuth.controller.js) is a custom string id, not a Mongo ObjectId (unlike
  // serveease's admin.controller.js, where req.user.id is a real User ObjectId).
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

propertyVerificationRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PropertyVerificationRequest', propertyVerificationRequestSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
