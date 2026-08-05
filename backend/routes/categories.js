const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { name, color, icon, appliesTo } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (appliesTo && !['expense', 'income', 'both'].includes(appliesTo)) {
      return res.status(400).json({ message: 'appliesTo must be expense, income, or both' });
    }

    const category = await Category.create({ user: req.user._id, name, color, icon, appliesTo });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That category already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, color, icon, appliesTo } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (appliesTo && !['expense', 'income', 'both'].includes(appliesTo)) {
      return res.status(400).json({ message: 'appliesTo must be expense, income, or both' });
    }

    const update = { name };
    if (color !== undefined) update.color = color;
    if (icon !== undefined) update.icon = icon;
    if (appliesTo !== undefined) update.appliesTo = appliesTo;

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That category already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;