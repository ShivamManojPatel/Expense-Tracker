const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');

router.use(protect);

// Marks the linked subscription paid — only moves lastPaidDate forward, never
// backward, so linking an old backfilled transaction can't overwrite a more
// recent real payment.
async function markSubscriptionPaid(subscriptionId, expenseDate, userId) {
  const sub = await Subscription.findOne({ _id: subscriptionId, user: userId });
  if (!sub) return; // not this user's subscription — silently ignore rather than error
  if (!sub.lastPaidDate || new Date(expenseDate) > new Date(sub.lastPaidDate)) {
    sub.lastPaidDate = expenseDate;
    await sub.save();
  }
}

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
    const { type, amount, category, note, tags, paymentMethod, date, isSplit, totalAmount, splitWith, linkedSubscription } = req.body;
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
      splitWith: isSplit ? splitWith : '',
      linkedSubscription: (type || 'expense') === 'expense' && linkedSubscription ? linkedSubscription : null
    });

    if (expense.linkedSubscription) {
      await markSubscriptionPaid(expense.linkedSubscription, expense.date, req.user._id);
    }

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
    if (expense.type !== 'expense') expense.linkedSubscription = null;
    await expense.save();

    if (expense.linkedSubscription) {
      await markSubscriptionPaid(expense.linkedSubscription, expense.date, req.user._id);
    }

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

    // If this was the transaction that most recently marked its subscription
    // paid, clear that — otherwise a deleted payment would leave a stale "Paid"
    // badge behind. We only clear (not recompute the next-most-recent linked
    // payment) to keep this simple; re-adding the transaction fixes it either way.
    if (expense.linkedSubscription) {
      const sub = await Subscription.findOne({ _id: expense.linkedSubscription, user: req.user._id });
      if (sub && sub.lastPaidDate && new Date(sub.lastPaidDate).getTime() === new Date(expense.date).getTime()) {
        sub.lastPaidDate = null;
        await sub.save();
      }
    }

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;