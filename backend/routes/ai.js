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

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Uses Groq's cloud API whenever a key is configured (works everywhere, including
// the deployed Render backend). Falls back to local Ollama when no key is set —
// e.g. for local dev without touching any cloud service.
async function generateSuggestions(prompt) {
  if (GROQ_API_KEY) {
    let response;
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6
        })
      });
    } catch (fetchErr) {
      const err = new Error(`Could not reach Groq: ${fetchErr.message}`);
      err.status = 502;
      throw err;
    }

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Groq request failed (${response.status}): ${errText}`);
      err.status = 502;
      throw err;
    }

    const data = await response.json();
    return (data.choices?.[0]?.message?.content || '').trim();
  }

  // No GROQ_API_KEY configured — fall back to local Ollama.
  let response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false })
    });
  } catch (fetchErr) {
    const err = new Error(
      `No GROQ_API_KEY set, and could not reach Ollama at ${OLLAMA_URL} either. Set GROQ_API_KEY in your environment, or make sure Ollama is installed and running locally (try "ollama run ${OLLAMA_MODEL}" once in a terminal to confirm).`
    );
    err.status = 502;
    throw err;
  }

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Ollama request failed: ${errText}`);
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  return (data.response || '').trim();
}

// GET /api/ai/insights — spending suggestions from the last 3 months, via Groq (if
// GROQ_API_KEY is set) or local Ollama otherwise
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

    const text = (await generateSuggestions(prompt)) || 'No suggestions available right now.';
    res.json({ suggestions: text });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;