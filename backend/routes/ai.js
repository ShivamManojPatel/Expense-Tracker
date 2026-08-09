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

// Strips markdown syntax the model might still emit (bold **, headers, bullet/number
// markers) so plain text renders cleanly in the UI without a markdown parser.
function cleanText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

// Accepts a full chat-style messages array (works the same for a single-turn
// "insights" request and a multi-turn chat conversation). Uses Groq's cloud API
// whenever a key is configured (works everywhere, including the deployed Render
// backend). Falls back to local Ollama when no key is set — e.g. for local dev
// without touching any cloud service.
async function generateCompletion(messages) {
  if (GROQ_API_KEY) {
    let response;
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.6 })
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

  // No GROQ_API_KEY configured — fall back to local Ollama's chat endpoint.
  let response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false })
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
  return (data.message?.content || '').trim();
}

// Shared last-3-months data pull, used by both /insights and /chat so the AI is
// grounded in the same numbers either way.
async function buildFinanceSummary(user) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [expenses, budgets, subscriptions, goals] = await Promise.all([
    Expense.find({ user: user._id, date: { $gte: threeMonthsAgo } }).sort({ date: -1 }).limit(300),
    Budget.find({ user: user._id }),
    Subscription.find({ user: user._id, active: true }),
    Goal.find({ user: user._id })
  ]);

  return {
    hasActivity: expenses.length > 0,
    summary: {
      currency: user.currency,
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
    }
  };
}

// Parses the model's insights response as a JSON array of strings (what we asked
// for). If the model didn't comply, falls back to treating it as freeform text
// split into lines — either way the caller always gets a clean string array, never
// raw markdown syntax.
function parseInsightsResponse(raw) {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      const items = parsed.filter((x) => typeof x === 'string' && x.trim()).map((x) => cleanText(x));
      if (items.length > 0) return items;
    }
  } catch (e) {
    // not valid JSON — fall through to plain-text handling
  }
  return cleaned.split('\n').map((l) => cleanText(l)).filter(Boolean);
}

// GET /api/ai/insights — spending suggestions from the last 3 months, via Groq (if
// GROQ_API_KEY is set) or local Ollama otherwise. Returns a clean string array.
router.get('/insights', async (req, res) => {
  try {
    const { hasActivity, summary } = await buildFinanceSummary(req.user);

    if (!hasActivity) {
      return res.json({ suggestions: ["You don't have enough transaction history yet — add a few expenses and check back for suggestions."] });
    }

    const prompt = `You are a personal finance assistant reviewing a user's transaction history from the last 3 months. Give practical, specific, encouraging suggestions grounded in the real numbers below — not generic advice. Cover, where the data supports it: spending patterns worth noting, categories trending up or down, budget adherence, subscription costs relative to spending, and progress toward savings goals. Refer to actual figures. Do not dump the raw data back verbatim, and do not add disclaimers about not being a financial advisor.

Respond with ONLY a JSON array of 3 to 6 short strings (no markdown, no bullet characters, no numbering, no code fences, no extra keys) — for example: ["First insight.", "Second insight."]. Each string should be one self-contained sentence or two.

Currency: ${summary.currency}

Data (JSON):
${JSON.stringify(summary)}`;

    const raw = await generateCompletion([{ role: 'user', content: prompt }]);
    const suggestions = raw ? parseInsightsResponse(raw) : [];
    res.json({ suggestions: suggestions.length > 0 ? suggestions : ['No suggestions available right now.'] });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// POST /api/ai/chat — conversational follow-up, grounded in the same last-3-months
// data as /insights. Body: { message: string, history?: [{role, content}] }
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'A message is required.' });
    }

    const { hasActivity, summary } = await buildFinanceSummary(req.user);

    const systemPrompt = hasActivity
      ? `You are a helpful personal finance assistant chatting with a user about their own spending. You have their last 3 months of transaction data below — use it to answer specifically and refer to real figures whenever relevant. Keep replies conversational and concise (a few sentences, occasionally a short list if genuinely helpful). Do not use markdown formatting (no **, no #, no bullet characters) — plain sentences only. Do not add disclaimers about not being a financial advisor. If asked something the data can't answer, say so plainly rather than guessing.

Currency: ${summary.currency}

Data (JSON):
${JSON.stringify(summary)}`
      : `You are a helpful personal finance assistant. This user doesn't have any transaction history yet, so answer generally and suggest they add some expenses to get personalized help. Keep replies concise and plain text, no markdown formatting.`;

    // Bound the history we forward so the prompt can't grow unbounded over a long
    // conversation — the last 10 turns is plenty of context for follow-ups.
    const trimmedHistory = Array.isArray(history)
      ? history.slice(-10).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      : [];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message.trim() }
    ];

    const raw = await generateCompletion(messages);
    res.json({ reply: cleanText(raw) || "Sorry, I didn't get a response — try asking again." });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;