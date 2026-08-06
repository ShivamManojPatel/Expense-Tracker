const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Subscription = require('../models/Subscription');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

router.use(protect);

// Escape regex special characters so search terms like "(", "+", "coffee (work)"
// don't throw an invalid-regex error and 500 the request.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/search?q=coffee
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ expenses: [], subscriptions: [], goals: [] });

    const rx = { $regex: escapeRegex(q), $options: 'i' };

    const [expenses, subscriptions, goals] = await Promise.all([
      Expense.find({
        user: req.user._id,
        $or: [{ note: rx }, { category: rx }, { tags: rx }]
      }).sort({ date: -1 }).limit(20),
      Subscription.find({ user: req.user._id, name: rx }).limit(10),
      Goal.find({ user: req.user._id, name: rx }).limit(10)
    ]);

    res.json({ expenses, subscriptions, goals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;