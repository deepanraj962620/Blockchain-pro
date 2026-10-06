const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: JWT_SECRET is not set in environment variables! An ephemeral secret was generated for this session. Please set JWT_SECRET in Render environment or server/.env for persistent sessions across restarts.');
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const decoded = verifyToken(token);
  if (decoded) {
    return {
      id: decoded.id || decoded.walletAddress || 'wallet-user',
      walletAddress: decoded.walletAddress || decoded.id || null,
      role: decoded.role || 'user'
    };
  }

  return {
    id: req.body?.owner || req.query?.owner || 'guest',
    walletAddress: req.body?.owner || req.query?.owner || null,
    role: 'user'
  };
}

function authenticateUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const decoded = verifyToken(token);
  if (decoded) {
    req.user = {
      id: decoded.id || decoded.walletAddress || 'wallet-user',
      walletAddress: decoded.walletAddress || decoded.id || null,
      role: decoded.role || 'user'
    };
    return next();
  }

  if (process.env.ALLOW_GUEST_MODE === 'true') {
    req.user = { id: 'guest', walletAddress: 'guest', role: 'user' };
    return next();
  }

  return res.status(401).json({ error: 'Wallet authentication required' });
}

function requireRole(allowedRole) {
  return (req, res, next) => {
    const user = getAuthUser(req);
    if (user.role !== allowedRole && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  getAuthUser,
  authenticateUser,
  requireRole
};
