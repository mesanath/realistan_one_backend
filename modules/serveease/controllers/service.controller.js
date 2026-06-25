const Category = require('../models/Category');
const Service = require('../models/Service');
const { getSurgeMultiplier, applySurge } = require('../services/surge.service');

// GET /api/v1/services/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/services?category=slug&city=Bangalore&featured=true
exports.getServices = async (req, res) => {
  try {
    const { category, city, featured, popular, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.categoryId = cat._id;
    }
    if (featured === 'true') filter.isFeatured = true;
    if (popular === 'true') filter.isPopular = true;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [services, total] = await Promise.all([
      Service.find(filter).populate('categoryId', 'name slug icon color').sort({ sortOrder: 1, bookingCount: -1 }).skip(skip).limit(parseInt(limit)),
      Service.countDocuments(filter),
    ]);

    // Adjust pricing for city
    const data = services.map((s) => {
      const obj = s.toObject();
      if (city) obj.displayPrice = s.getPriceForCity(city);
      return obj;
    });

    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/services/:id
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('categoryId', 'name slug icon color');
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: 'Service not found' });
    const obj = service.toObject();
    if (req.query.city) obj.displayPrice = service.getPriceForCity(req.query.city);
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/services/:id/surge?scheduledAt=<ISO>
// Public — returns surge multiplier + prices for a given slot
exports.getSurgePrice = async (req, res) => {
  try {
    const { scheduledAt, packageName, city } = req.query;
    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'scheduledAt query param is required' });
    }

    const service = await Service.findById(req.params.id).select('basePrice packages cityPricing name isActive');
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Determine the base price for this request (package-aware, city-aware)
    let originalPrice = city ? service.getPriceForCity(city) : service.basePrice;
    if (packageName) {
      const pkg = service.packages.find((p) => p.name === packageName);
      if (pkg) originalPrice = pkg.price;
    }

    const surge = getSurgeMultiplier(scheduledAt, city);
    const surgePrice = applySurge(originalPrice, surge.multiplier);

    return res.json({
      success: true,
      data: {
        multiplier: surge.multiplier,
        label: surge.label,
        reason: surge.reason,
        originalPrice,
        surgePrice,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: CRUD ──────────────────────────────────────────

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    await Category.findByIdAndUpdate(service.categoryId, { $inc: { serviceCount: 1 } });
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    await Category.findByIdAndUpdate(service.categoryId, { $inc: { serviceCount: -1 } });
    res.json({ success: true, message: 'Service deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
