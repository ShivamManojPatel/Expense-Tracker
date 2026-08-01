const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/goals
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/goals
router.post('/', async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, targetDate, notes } = req.body;
    if (!name || !targetAmount) {
      return res.status(400).json({ message: 'Name and targetAmount are required' });
    }
    const goal = await Goal.create({
      user: req.user._id,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      targetDate,
      notes
    });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/goals/:id  (also used to add a contribution: pass currentAmount)
router.put('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    Object.assign(goal, req.body);
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;