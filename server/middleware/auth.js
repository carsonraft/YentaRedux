const jwt = require('jsonwebtoken');
const db = require('../db/pool');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: { message: 'Access token required' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid token' } });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: { message: 'Invalid or expired token' } });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};