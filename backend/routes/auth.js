const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const generateToken = require('../utils/generateToken');
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
      token: generateToken(user._id)
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
      token: generateToken(user._id)
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
    lockedTabs: req.user.lockedTabs || []
  });
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
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password — no email service configured, so the reset
// link is printed to the backend console instead of sent by email. Always
// responds the same way whether or not the email exists, to avoid leaking
// which emails have accounts.
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

      console.log('\n=== Password reset requested ===');
      console.log(`User:  ${user.email}`);
      console.log(`Link:  ${resetLink}`);
      console.log('Expires in 15 minutes.');
      console.log('=================================\n');
    }

    res.json({ message: 'If that email has an account, a reset link has been printed to the backend server console.' });
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

module.exports = router;