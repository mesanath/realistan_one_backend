const jwt = require('jsonwebtoken');
const { verifyAuthToken } = require('../utils/token');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  const token = header.split(' ')[1];
  try {
    // Primary: the one shared login system (customers/agents)
    req.user = verifyAuthToken(token);
    return next();
  } catch {
    try {
      // Secondary: unified admin tokens (separate system — JWT_ADMIN_SECRET || JWT_SIG)
      const adminSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SIG;
      const decoded = jwt.verify(token, adminSecret);
      if (decoded.isSuperAdmin || decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
