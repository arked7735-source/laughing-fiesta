const jwt = require('jsonwebtoken');

// Usage: require('./middleware/auth')(['admin']) or (['admin','client'])
module.exports = (roles = []) => (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: 'Forbidden' });

    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
