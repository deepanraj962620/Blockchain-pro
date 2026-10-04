const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in server/.env or your hosting environment.');
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
