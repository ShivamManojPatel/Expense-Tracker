const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/expenses?category=&from=&to=&search=&type=&tag=
router.get('/', async (req, res) => {
  try {
    const { category, from, to, search, type, tag } = req.query;
    const filter = { user: req.user._id };

    if (category && category !== 'All') filter.category = category;
    if (type && type !== 'All') filter.type = type;
    if (tag) filter.tags = tag;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (search) filter.note = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, note, tags, paymentMethod, date, isSplit, totalAmount, splitWith } = req.body;
    if (!amount || !category) {
      return res.status(400).json({ message: 'Amount and category are required' });
    }
    const expense = await Expense.create({
      user: req.user._id,
      type: type || 'expense',
      amount,
      category,
      note,
      tags: Array.isArray(tags) ? tags : [],
      paymentMethod,
      date: date || Date.now(),
      isSplit: !!isSplit,
      totalAmount: isSplit ? totalAmount : undefined,
      splitWith: isSplit ? splitWith : ''
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    Object.assign(expense, req.body);
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;