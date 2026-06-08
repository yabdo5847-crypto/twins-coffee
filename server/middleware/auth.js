// ============================================================
//  The Twins Coffee® — Auth Middleware
//  Verifies JWT token from Authorization: Bearer <token>
// ============================================================
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'twins-coffee-secret-change-in-production';

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

function generateToken(adminData) {
  return jwt.sign(adminData, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAdmin, generateToken };
