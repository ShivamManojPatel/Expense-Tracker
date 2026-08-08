const mongoose = require('mongoose');

// One document per issued JWT ("device"). The JWT itself carries a `jti` claim
// that must match tokenId here for the token to be accepted (see middleware/auth.js) —
// this is what makes revocation possible for otherwise-stateless JWTs: deleting the
// Session document immediately invalidates that token, even though it hasn't expired yet.
const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenId: { type: String, required: true, unique: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

sessionSchema.index({ user: 1 });
// TTL index — MongoDB automatically deletes the document once expiresAt passes,
// so expired sessions clean themselves up without a cron job.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);