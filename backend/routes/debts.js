const express = require('express');
const router = express.Router();
const Debt = require('../models/Debt');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/debts?person=&type=
router.get('/', async (req, res) => {
  try {
    const { person, type } = req.query;
    const filter = { user: req.user._id };
    if (person && person !== 'All') filter.person = person;
    if (type && type !== 'All') filter.type = type;

    const debts = await Debt.find(filter).sort({ date: -1 });
    res.json(debts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/debts/summary — totals grouped by person
router.get('/summary', async (req, res) => {
  try {
    const rows = await Debt.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$person',
          borrowed: { $sum: { $cond: [{ $eq: ['$type', 'borrowed'] }, '$amount', 0] } },
          repaid: { $sum: { $cond: [{ $eq: ['$type', 'repaid'] }, '$amount', 0] } },
          lastActivity: { $max: '$date' }
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);

    const summary = rows.map((r) => ({
      person: r._id,
      borrowed: r.borrowed,
      repaid: r.repaid,
      outstanding: r.borrowed - r.repaid,
      lastActivity: r.lastActivity
    }));

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/debts
router.post('/', async (req, res) => {
  try {
    const { person, type, amount, remarks, date } = req.body;
    if (!person || !type || !amount) {
      return res.status(400).json({ message: 'Person, type and amount are required' });
    }
    const debt = await Debt.create({
      user: req.user._id,
      person,
      type,
      amount,
      remarks,
      date: date || Date.now()
    });
    res.status(201).json(debt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/debts/:id
router.put('/:id', async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user._id });
    if (!debt) return res.status(404).json({ message: 'Debt entry not found' });

    Object.assign(debt, req.body);
    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/debts/:id
router.delete('/:id', async (req, res) => {
  try {
    const debt = await Debt.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!debt) return res.status(404).json({ message: 'Debt entry not found' });
    res.json({ message: 'Debt entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;