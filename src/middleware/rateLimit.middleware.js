const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isTest ? 1000 : 3,
  message: { success: false, message: 'Too many OTP requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 5,
  message: { success: false, message: 'Too many OTP verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const bookingCreateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 10,
  message: { success: false, message: 'Too many booking requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const agentActionLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 30,
  message: { success: false, message: 'Too many agent actions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminMutationLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 60,
  message: { success: false, message: 'Too many admin mutations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  otpRateLimit,
  otpVerifyLimit,
  apiRateLimit,
  bookingCreateLimit,
  agentActionLimit,
  adminMutationLimit,
};
