const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Creates a Session record for this login/signup and signs a JWT carrying its id
// (jti). Returns the token to send back to the client.
async function createSession(userId, req) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

  await Session.create({
    user: userId,
    tokenId,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    expiresAt
  });

  return jwt.sign({ id: userId, jti: tokenId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

module.exports = createSession;