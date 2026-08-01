const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/budgets  -> includes current month spend per category
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const spendAgg = await Expense.aggregate([
      { $match: { user: req.user._id, type: 'expense', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    const spendMap = Object.fromEntries(spendAgg.map((s) => [s._id, s.total]));

    const result = budgets.map((b) => ({
      _id: b._id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent: spendMap[b.category] || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/budgets  (upsert by category)
router.post('/', async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;
    if (!category || monthlyLimit == null) {
      return res.status(400).json({ message: 'Category and monthlyLimit are required' });
    }
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category },
      { monthlyLimit },
      { new: true, upsert: true }
    );
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
