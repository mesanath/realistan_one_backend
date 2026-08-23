const mongoose = require('mongoose');

// An agent's request to add a new Category to their `skills` — requires admin approval
// instead of the agent silently self-editing skills via PATCH /agents/profile.
const agentSkillRequestSchema = new mongoose.Schema({
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  note:       { type: String, trim: true, maxlength: 500, default: '' },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

agentSkillRequestSchema.index({ agentId: 1 });
agentSkillRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AgentSkillRequest', agentSkillRequestSchema);
