const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Session = require('../models/Session');
const createSession = require('../utils/createSession');
const sendEmail = require('../utils/sendEmail');
const { protect } = require('../middleware/auth');

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#D85A30', icon: 'ti-tools-kitchen-2' },
  { name: 'Transport', color: '#378ADD', icon: 'ti-car' },
  { name: 'Housing', color: '#639922', icon: 'ti-home' },
  { name: 'Subscriptions', color: '#7F77DD', icon: 'ti-refresh' },
  { name: 'Shopping', color: '#D4537E', icon: 'ti-shopping-bag' },
  { name: 'Entertainment', color: '#BA7517', icon: 'ti-movie' },
  { name: 'Health', color: '#1D9E75', icon: 'ti-heart' },
  { name: 'Other', color: '#888780', icon: 'ti-dots' }
];

const LOCKABLE_TABS = ['transactions', 'subscriptions', 'goals', 'savings', 'debts', 'analytics'];

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({ name, email, password, currency: currency || 'USD' });

    await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }))
    );

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      hasPin: false,
      lockedTabs: [],
      monthlyReportEmail: user.monthlyReportEmail,
      themeColors: user.themeColors,
      token: await createSession(user._id, req)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      hasPin: !!user.pinHash,
      lockedTabs: user.lockedTabs || [],
      monthlyReportEmail: user.monthlyReportEmail,
      themeColors: user.themeColors,
      token: await createSession(user._id, req)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    currency: req.user.currency,
    hasPin: !!req.user.pinHash,
    lockedTabs: req.user.lockedTabs || [],
    monthlyReportEmail: req.user.monthlyReportEmail,
    themeColors: req.user.themeColors
  });
});

// POST /api/auth/logout — revokes only the session tied to the token used for
// this request, i.e. signs out this device without touching any others.
router.post('/logout', protect, async (req, res) => {
  try {
    await Session.deleteOne({ user: req.user._id, tokenId: req.sessionId });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/sessions — list this user's active/logged-in devices
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ lastActive: -1 });
    res.json(
      sessions.map((s) => ({
        _id: s._id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
        current: s.tokenId === req.sessionId
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/sessions/:id — revoke one specific session/device. Revoking the
// current one signs this device out too (its next request will get a 401).
router.delete('/sessions/:id', protect, async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/sessions — "log out of all other devices": revokes every
// session for this user except the one making this request.
router.delete('/sessions', protect, async (req, res) => {
  try {
    const result = await Session.deleteMany({ user: req.user._id, tokenId: { $ne: req.sessionId } });
    res.json({ message: 'Other sessions revoked', count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/change-password — while logged in, requires the current password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const ok = await req.user.matchPassword(currentPassword);
    if (!ok) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    req.user.password = newPassword;
    await req.user.save();
    // Changing the password is a natural moment to sign out anywhere else this
    // account might be logged in — keep only the session making this request.
    await Session.deleteMany({ user: req.user._id, tokenId: { $ne: req.sessionId } });
    res.json({ message: 'Password updated. You have been signed out on all other devices.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password — sends a reset link by email if GMAIL_USER/
// GMAIL_APP_PASSWORD are configured, otherwise falls back to printing it to the
// backend console. Always responds the same way whether or not the email exists,
// to avoid leaking which emails have accounts.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.resetTokenHash = tokenHash;
      user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetLink = `${clientUrl}/reset-password?token=${rawToken}`;

      await sendEmail({
        to: user.email,
        subject: 'Reset your Ledger password',
        text: `Reset your password: ${resetLink}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #CBA24D;">Reset your Ledger password</h2>
            <p>We got a request to reset the password on your Ledger account. This link expires in 15 minutes.</p>
            <p><a href="${resetLink}" style="display: inline-block; background: #CBA24D; color: #1A1204; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset password</a></p>
            <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will stay unchanged.</p>
          </div>
        `
      });
    }

    res.json({ message: 'If that email has an account, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password — consumes the token printed to the console
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    user.password = newPassword;
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    await user.save();

    // A password reset is exactly the moment to assume any existing session could
    // be the reason the password needed resetting — sign out everywhere.
    await Session.deleteMany({ user: user._id });

    res.json({ message: 'Password reset — you can log in with your new password now.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/pin — set or change the PIN
router.post('/pin', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be 4 to 6 digits' });
    }
    const salt = await bcrypt.genSalt(10);
    req.user.pinHash = await bcrypt.hash(pin, salt);
    await req.user.save();
    res.json({ message: 'PIN set', hasPin: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/pin — remove the PIN and unlock every tab
router.delete('/pin', protect, async (req, res) => {
  try {
    req.user.pinHash = null;
    req.user.lockedTabs = [];
    await req.user.save();
    res.json({ message: 'PIN removed', hasPin: false, lockedTabs: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/pin/verify
router.post('/pin/verify', protect, async (req, res) => {
  try {
    if (!req.user.pinHash) {
      return res.status(400).json({ message: 'No PIN is set yet — set one in Settings first.' });
    }
    const { pin } = req.body;
    const valid = !!pin && (await bcrypt.compare(pin, req.user.pinHash));
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/locked-tabs
router.put('/locked-tabs', protect, async (req, res) => {
  try {
    const { lockedTabs } = req.body;
    if (!Array.isArray(lockedTabs)) {
      return res.status(400).json({ message: 'lockedTabs must be an array' });
    }
    const cleaned = [...new Set(lockedTabs)].filter((t) => LOCKABLE_TABS.includes(t));
    if (cleaned.length > 0 && !req.user.pinHash) {
      return res.status(400).json({ message: 'Set a PIN before locking any tab.' });
    }
    req.user.lockedTabs = cleaned;
    await req.user.save();
    res.json({ lockedTabs: cleaned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/monthly-report-email — opt in/out of the monthly summary email
router.put('/monthly-report-email', protect, async (req, res) => {
  try {
    req.user.monthlyReportEmail = !!req.body.enabled;
    await req.user.save();
    res.json({ monthlyReportEmail: req.user.monthlyReportEmail });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/theme — save a custom color theme, or pass themeColors: null to
// reset to the default. Only the 7 known keys with valid #rrggbb hex values are
// accepted — anything else in the payload is silently dropped, not stored.
const THEME_KEYS = ['background', 'card', 'border', 'text', 'accent', 'income', 'expense'];
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

router.put('/theme', protect, async (req, res) => {
  try {
    const { themeColors } = req.body;

    if (themeColors === null) {
      req.user.themeColors = null;
      await req.user.save();
      return res.json({ themeColors: null });
    }

    if (typeof themeColors !== 'object' || Array.isArray(themeColors)) {
      return res.status(400).json({ message: 'themeColors must be an object or null' });
    }

    const cleaned = {};
    for (const key of THEME_KEYS) {
      const value = themeColors[key];
      if (value !== undefined) {
        if (!HEX_PATTERN.test(value)) {
          return res.status(400).json({ message: `${key} must be a valid #rrggbb hex color` });
        }
        cleaned[key] = value;
      }
    }

    req.user.themeColors = cleaned;
    await req.user.save();
    res.json({ themeColors: cleaned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;