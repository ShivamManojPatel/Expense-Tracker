const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');
const { isPaidThisCycle } = require('../utils/subscriptionCycle');

router.use(protect);

// GET /api/subscriptions
router.get('/', async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.user._id }).sort({ billingDay: 1 });
    const now = new Date();
    res.json(subs.map((s) => ({ ...s.toObject(), paidThisCycle: isPaidThisCycle(s, now) })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  try {
    const { name, amount, category, billingCycle, billingDay, startDate, notes } = req.body;
    const needsBillingDay = !billingCycle || billingCycle === 'Monthly' || billingCycle === 'Yearly';
    if (!name || !amount || (needsBillingDay && !billingDay)) {
      return res.status(400).json({ message: 'Name, amount, and billing day are required' });
    }
    const sub = await Subscription.create({
      user: req.user._id,
      name,
      amount,
      category,
      billingCycle,
      billingDay,
      startDate,
      notes
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    Object.assign(sub, req.body);
    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;