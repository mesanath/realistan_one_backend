const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  const token = header.split(' ')[1];
  try {
    // Primary: verify with JWT_SECRET (regular serveease users/agents)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // Secondary: accept unified admin tokens (JWT_ADMIN_SECRET || JWT_SIG)
      const adminSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SIG;
      const decoded = jwt.verify(token, adminSecret);
      if (decoded.isSuperAdmin || decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
