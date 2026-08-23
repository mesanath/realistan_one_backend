const jwt = require('jsonwebtoken');
const { verifyAuthToken } = require('../utils/token');
const { SERVEEASE_ROLES } = require('../../constants/adminRoles');

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
      // Secondary: unified admin tokens (separate system — JWT_ADMIN_SECRET || JWT_SIG).
      // Accepted here if it's a genuine super admin, the legacy binary role==='admin'
      // shape, or carries any of the granular serveeaseRole values (admin/operations/
      // customer_services_management) issued by realistan-admin's own /auth/login —
      // see modules/realestate-admin/controllers/auth.controller.js.
      const adminSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SIG;
      const decoded = jwt.verify(token, adminSecret);
      const hasAdminIdentity = decoded.isSuperAdmin
        || decoded.role === 'admin'
        || SERVEEASE_ROLES.includes(decoded.serveeaseRole);
      if (hasAdminIdentity) {
        req.user = decoded;
        return next();
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  }
};

// Checks serveeaseRole first (the granular admin/operations/customer_services_management
// role — see constants/adminRoles.js) and falls back to the plain `role` field, which is
// how customer/agent tokens are checked (authorize('customer', 'agent', ...)) and how the
// legacy binary admin token shape ({ role: 'admin' }, no serveeaseRole) still works.
const authorize = (...roles) => (req, res, next) => {
  const effectiveRole = req.user?.serveeaseRole || req.user?.role;
  if (!roles.includes(effectiveRole)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
