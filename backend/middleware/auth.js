const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const LAST_ACTIVE_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // avoid a DB write on every single request

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // The JWT alone isn't enough — it must also match a live Session document.
      // Deleting that document (via the sessions API) revokes the token immediately,
      // even though the JWT itself would otherwise still be valid for up to 30 days.
      const session = await Session.findOne({ tokenId: decoded.jti, user: decoded.id });
      if (!session) {
        return res.status(401).json({ message: 'Session expired or was signed out from another device' });
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.sessionId = decoded.jti;

      if (Date.now() - session.lastActive.getTime() > LAST_ACTIVE_UPDATE_INTERVAL_MS) {
        session.lastActive = new Date();
        session.save().catch(() => {});
      }

      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };