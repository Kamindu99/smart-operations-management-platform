const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'somp_super_secret_jwt_key_2024';

const authenticate = (req, res, next) => {
  try {
    const userHeader = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const userEmail = req.headers['x-user-email'];
    const userName = req.headers['x-user-name'];

    if (userHeader) {
      req.user = { id: userHeader, role: userRole, email: userEmail, name: userName };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
