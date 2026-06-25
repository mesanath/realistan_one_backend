const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a random N-digit numeric OTP
 */
const generateOtp = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(crypto.randomInt(min, max + 1));
};

/**
 * Hash an OTP for secure storage in MongoDB
 */
const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Compare raw OTP with stored hash
 */
const verifyOtp = async (rawOtp, hashedOtp) => {
  return bcrypt.compare(rawOtp, hashedOtp);
};

module.exports = { generateOtp, hashOtp, verifyOtp };
