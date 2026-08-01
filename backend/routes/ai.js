const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Subscription = require('../models/Subscription');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

router.use(protect);

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

// GET /api/ai/insights — locally generated spending suggestions from the last 3 months, via Ollama
router.get('/insights', async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [expenses, budgets, subscriptions, goals] = await Promise.all([
      Expense.find({ user: req.user._id, date: { $gte: threeMonthsAgo } }).sort({ date: -1 }).limit(300),
      Budget.find({ user: req.user._id }),
      Subscription.find({ user: req.user._id, active: true }),
      Goal.find({ user: req.user._id })
    ]);

    if (expenses.length === 0) {
      return res.json({ suggestions: "You don't have enough transaction history yet — add a few expenses and check back for suggestions." });
    }

    const summary = {
      currency: req.user.currency,
      expenses: expenses.map((e) => ({
        type: e.type,
        amount: e.amount,
        category: e.category,
        note: e.note,
        date: e.date,
        tags: e.tags
      })),
      budgets: budgets.map((b) => ({ category: b.category, monthlyLimit: b.monthlyLimit })),
      subscriptions: subscriptions.map((s) => ({ name: s.name, amount: s.amount, billingCycle: s.billingCycle })),
      goals: goals.map((g) => ({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount }))
    };

    const prompt = `You are a personal finance assistant reviewing a user's transaction history from the last 3 months. Give practical, specific, encouraging suggestions grounded in the real numbers below — not generic advice. Cover, where the data supports it: spending patterns worth noting, categories trending up or down, budget adherence, subscription costs relative to spending, and progress toward savings goals. Keep it under 300 words. Use short paragraphs or a few bullet points. Refer to actual figures. Do not dump the raw data back verbatim, and do not add disclaimers about not being a financial advisor.

Currency: ${summary.currency}

Data (JSON):
${JSON.stringify(summary)}`;

    let response;
    try {
      response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false })
      });
    } catch (fetchErr) {
      return res.status(502).json({
        message: `Could not reach Ollama at ${OLLAMA_URL}. Make sure Ollama is installed and running (it starts automatically after install — try running "ollama run ${OLLAMA_MODEL}" once in a terminal to confirm).`
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ message: `Ollama request failed: ${errText}` });
    }

    const data = await response.json();
    const text = (data.response || '').trim() || 'No suggestions available right now.';

    res.json({ suggestions: text });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;