const FraudUser = require('../models/FraudUser');
const Setting = require('../models/Setting');
const { invalidateSettingsCache } = require('../services/fraud.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _parseValue(value, dataType) {
  switch (dataType) {
    case 'number':  return Number(value);
    case 'boolean': return value === true || value === 'true' || value === '1' || value === 1;
    case 'json':    return typeof value === 'string' ? JSON.parse(value) : value;
    default:        return String(value);
  }
}

// ─── Fraud Users ─────────────────────────────────────────────────────────────

// GET /api/v1/serveease/admin/fraud-users
exports.getFraudUsers = async (req, res) => {
  try {
    const { isFlagged, isBlocked, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (isFlagged !== undefined) filter.isFlagged = isFlagged === 'true';
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      FraudUser.find(filter).sort({ flaggedAt: -1, lastRequestAt: -1 }).skip(skip).limit(parseInt(limit)),
      FraudUser.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/serveease/admin/fraud-users/:phone
exports.getFraudUserByPhone = async (req, res) => {
  try {
    const record = await FraudUser.findOne({ phone: req.params.phone });
    if (!record) return res.status(404).json({ success: false, message: 'No fraud record found for this phone' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/serveease/admin/fraud-users/:phone/unblock
exports.unblockFraudUser = async (req, res) => {
  try {
    const record = await FraudUser.findOneAndUpdate(
      { phone: req.params.phone },
      { $set: { isBlocked: false, blockedUntil: null } },
      { new: true },
    );
    if (!record) return res.status(404).json({ success: false, message: 'No fraud record found for this phone' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/serveease/admin/fraud-users/:phone/flag
exports.flagFraudUser = async (req, res) => {
  try {
    const { flagReason = 'manual_flag', blockMinutes } = req.body;
    const now = new Date();
    const record = await FraudUser.findOneAndUpdate(
      { phone: req.params.phone },
      {
        $set: {
          isFlagged: true,
          flagReason,
          flaggedAt: now,
          isBlocked: true,
          blockedUntil: blockMinutes ? new Date(now.getTime() + parseInt(blockMinutes) * 60_000) : null,
        },
        $setOnInsert: { firstRequestAt: now, phone: req.params.phone },
      },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Settings — full CRUD ─────────────────────────────────────────────────────

// GET /api/v1/serveease/admin/settings
// Returns all settings sorted: system keys first, then custom keys alphabetically.
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find({}).sort({ isSystem: -1, key: 1 });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/serveease/admin/settings  — add a new custom key
exports.createSetting = async (req, res) => {
  try {
    const { key, value, dataType = 'string', description = '' } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'key is required' });
    if (value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'value is required' });
    }

    let parsed;
    try {
      parsed = _parseValue(value, dataType);
    } catch {
      return res.status(400).json({ success: false, message: `Cannot parse value as ${dataType}` });
    }

    const setting = await Setting.create({ key, value: parsed, dataType, description, isSystem: false });
    invalidateSettingsCache();
    res.status(201).json({ success: true, data: setting });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `Setting key "${req.body.key}" already exists` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/serveease/admin/settings/:key  — update a single setting
exports.updateSetting = async (req, res) => {
  try {
    const { value, description, dataType } = req.body;
    const existing = await Setting.findOne({ key: req.params.key.toUpperCase() });
    if (!existing) return res.status(404).json({ success: false, message: 'Setting not found' });

    const updates = {};
    if (description !== undefined) updates.description = description;

    // System keys cannot change their dataType
    const resolvedType = (dataType && !existing.isSystem) ? dataType : existing.dataType;
    if (dataType && !existing.isSystem) updates.dataType = dataType;

    if (value !== undefined) {
      try {
        updates.value = _parseValue(value, resolvedType);
      } catch {
        return res.status(400).json({ success: false, message: `Cannot parse value as ${resolvedType}` });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update — send value, description, or dataType' });
    }

    const updated = await Setting.findOneAndUpdate(
      { key: req.params.key.toUpperCase() },
      { $set: updates },
      { new: true, runValidators: true },
    );
    invalidateSettingsCache();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/serveease/admin/settings/:key  — remove a custom key
exports.deleteSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key.toUpperCase() });
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });
    if (setting.isSystem) {
      return res.status(400).json({ success: false, message: 'System settings cannot be deleted. You can edit their values.' });
    }
    await Setting.deleteOne({ key: setting.key });
    invalidateSettingsCache();
    res.json({ success: true, message: `Setting "${setting.key}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/serveease/admin/settings/bulk  — dashboard "save all" button
// Body: { settings: [{ key, value, description? }, ...] }
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ success: false, message: 'settings must be a non-empty array of { key, value } objects' });
    }

    // Fetch current dataTypes so we can coerce correctly
    const keys = settings.map((s) => String(s.key).toUpperCase());
    const existingDocs = await Setting.find({ key: { $in: keys } });
    const typeMap = {};
    for (const d of existingDocs) typeMap[d.key] = d.dataType;

    const ops = [];
    const errors = [];
    for (const entry of settings) {
      const key = String(entry.key).toUpperCase();
      if (!key) { errors.push('key is required for each entry'); continue; }
      const dataType = typeMap[key] || 'string';
      let parsed;
      try {
        parsed = _parseValue(entry.value, dataType);
      } catch {
        errors.push(`Cannot parse value for key "${key}" as ${dataType}`);
        continue;
      }
      const setFields = { value: parsed };
      if (entry.description !== undefined) setFields.description = entry.description;
      ops.push({ updateOne: { filter: { key }, update: { $set: setFields } } });
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    await Setting.bulkWrite(ops);
    invalidateSettingsCache();
    res.json({ success: true, message: `${ops.length} setting(s) saved` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
