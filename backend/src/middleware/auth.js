const jwt = require('jsonwebtoken');
const { ROLES } = require('../constants/roles');

const authenticate = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Restricts route access to ADMIN role only.
 * Uses ROLES constant — no hardcoded strings.
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

/**
 * Restricts route access to a specific role or multiple roles.
 * Usage: authorizeRoles(ROLES.ADMIN, ROLES.AGENT)
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        error: `Forbidden. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorizeAdmin, authorizeRoles };
