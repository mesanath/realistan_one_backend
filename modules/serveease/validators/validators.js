const { body, param, validationResult } = require('express-validator');

// Sends a 400 with all field errors if any validation failed.
// Use as the last middleware in a validator chain array.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Accepts `mobile` (unified canonical) or `phone` (legacy)
const INDIAN_MOBILE_RE = /^(\+91|91|0{2}91)?[6-9]\d{9}$/;

const sendOtpRules = [
  body().custom((b) => {
    const num = (b.mobile || b.phone || '').trim();
    if (!num) throw new Error('mobile is required');
    if (!INDIAN_MOBILE_RE.test(num)) throw new Error('Enter a valid Indian mobile number');
    return true;
  }),
  body('type')
    .optional()
    .isIn(['realestate', 'serveease']).withMessage('type must be "realestate" or "serveease"'),
  body('role')
    .optional()
    .isIn(['customer', 'agent', 'admin']).withMessage('role must be customer, agent, or admin'),
  validate,
];

const verifyOtpRules = [
  body().custom((b) => {
    const num = (b.mobile || b.phone || '').trim();
    if (!num) throw new Error('mobile is required');
    return true;
  }),
  body('otp')
    .trim().notEmpty().withMessage('otp is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  body('type')
    .optional()
    .isIn(['realestate', 'serveease']).withMessage('type must be "realestate" or "serveease"'),
  body('role')
    .optional()
    .isIn(['customer', 'agent', 'admin']).withMessage('Invalid role'),
  validate,
];

const updateProfileRules = [
  body('name')
    .optional().trim()
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
  body('email')
    .optional().trim()
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  validate,
];

// ─── Booking ──────────────────────────────────────────────────────────────────

const createBookingRules = [
  body('serviceId')
    .notEmpty().withMessage('serviceId is required')
    .isMongoId().withMessage('serviceId must be a valid ID'),
  body('address.addressLine')
    .trim().notEmpty().withMessage('address.addressLine is required'),
  body('address.city')
    .trim().notEmpty().withMessage('address.city is required'),
  body('address.pincode')
    .optional().trim()
    .matches(/^\d{6}$/).withMessage('pincode must be 6 digits'),
  body('scheduledAt')
    .notEmpty().withMessage('scheduledAt is required')
    .isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date')
    .custom((val) => {
      if (new Date(val) <= new Date()) throw new Error('scheduledAt must be in the future');
      return true;
    }),
  body('paymentMethod')
    .optional()
    .isIn(['upi', 'card', 'cod', 'wallet']).withMessage('Invalid payment method'),
  body('preferredAgentId')
    .optional()
    .isMongoId().withMessage('preferredAgentId must be a valid ID'),
  validate,
];

const verifyOtpBookingRules = [
  param('id').isMongoId().withMessage('Booking ID must be a valid ID'),
  body('otp')
    .trim().notEmpty().withMessage('otp is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  validate,
];

const cancelBookingRules = [
  param('id').isMongoId().withMessage('Booking ID must be a valid ID'),
  body('reason')
    .optional().trim()
    .isLength({ max: 200 }).withMessage('Reason must be under 200 characters'),
  validate,
];

// ─── Agent profile ────────────────────────────────────────────────────────────

const updateAgentProfileRules = [
  body('name')
    .optional().trim()
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
  body('bio')
    .optional().trim()
    .isLength({ max: 500 }).withMessage('Bio must be under 500 characters'),
  body('skills')
    .optional()
    .isArray().withMessage('skills must be an array'),
  body('skills.*')
    .optional()
    .isMongoId().withMessage('Each skill must be a valid category ID'),
  body('bankDetails.accountNumber')
    .optional().trim()
    .isLength({ min: 9, max: 18 }).withMessage('Account number must be 9–18 digits')
    .isNumeric().withMessage('Account number must be numeric'),
  body('bankDetails.ifsc')
    .optional().trim()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('IFSC code format is invalid'),
  validate,
];

const applyLeaveRules = [
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('date must be ISO 8601'),
  body('reason')
    .optional().trim()
    .isLength({ max: 200 }).withMessage('Reason must be under 200 characters'),
  validate,
];

// ─── Admin — Service CRUD ─────────────────────────────────────────────────────

const createServiceRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('slug').trim().notEmpty().withMessage('slug is required').matches(/^[a-z0-9-]+$/).withMessage('slug must be lowercase alphanumeric with hyphens'),
  body('categoryId').notEmpty().withMessage('categoryId is required').isMongoId(),
  body('basePrice').notEmpty().withMessage('basePrice is required').isFloat({ min: 0 }).withMessage('basePrice must be a non-negative number'),
  body('durationMinutes').optional().isInt({ min: 1 }).withMessage('durationMinutes must be a positive integer'),
  validate,
];

const updateServiceRules = [
  param('id').isMongoId().withMessage('Service ID must be valid'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('basePrice must be non-negative'),
  body('durationMinutes').optional().isInt({ min: 1 }),
  validate,
];

// ─── Admin — Agent CRUD ───────────────────────────────────────────────────────

const createAgentRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ min: 2, max: 60 }),
  body('phone')
    .trim().notEmpty().withMessage('phone is required')
    .matches(/^(\+91|91|0{2}91)?[6-9]\d{9}$/).withMessage('Enter a valid Indian mobile number'),
  body('city').trim().notEmpty().withMessage('city is required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  validate,
];

const updateAgentRules = [
  param('id').isMongoId().withMessage('Agent ID must be valid'),
  body('name').optional().trim().isLength({ min: 2, max: 60 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('city').optional().trim().notEmpty(),
  validate,
];

// ─── Payment ──────────────────────────────────────────────────────────────────

const createPaymentOrderRules = [
  body('bookingId').notEmpty().withMessage('bookingId is required').isMongoId(),
  validate,
];

const verifyPaymentRules = [
  body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
  body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required'),
  validate,
];

module.exports = {
  validate,
  sendOtpRules,
  verifyOtpRules,
  updateProfileRules,
  createBookingRules,
  verifyOtpBookingRules,
  cancelBookingRules,
  updateAgentProfileRules,
  applyLeaveRules,
  createServiceRules,
  updateServiceRules,
  createAgentRules,
  updateAgentRules,
  createPaymentOrderRules,
  verifyPaymentRules,
};
