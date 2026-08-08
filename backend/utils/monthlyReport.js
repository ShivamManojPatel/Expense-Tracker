const User = require('../models/User');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { formatMoney } = require('./format');
const sendEmail = require('./sendEmail');

// Previous calendar month's UTC boundaries — expense dates are stored as UTC
// midnight of the picked calendar day (see date-handling notes elsewhere in the
// app), so month math has to stay in UTC to match, not the server's local time.
function previousMonthRangeUTC(reference = new Date()) {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth(); // 0-indexed; "last month" relative to reference
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start, end, label };
}

async function buildReportForUser(user, reference = new Date()) {
  const { start, end, label } = previousMonthRangeUTC(reference);

  const [expenses, budgets] = await Promise.all([
    Expense.find({ user: user._id, date: { $gte: start, $lte: end } }),
    Budget.find({ user: user._id })
  ]);

  const spend = expenses.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = expenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const saved = expenses.filter((e) => e.type === 'saving_deposit').reduce((s, e) => s + e.amount, 0)
    - expenses.filter((e) => e.type === 'saving_withdrawal').reduce((s, e) => s + e.amount, 0);

  const byCategory = {};
  expenses.filter((e) => e.type === 'expense').forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const overBudget = budgets.filter((b) => {
    const spentInCategory = byCategory[b.category] || 0;
    return b.monthlyLimit > 0 && spentInCategory > b.monthlyLimit;
  });

  return { label, spend, income, net: income - spend, saved, topCategories, overBudget, hasActivity: expenses.length > 0 };
}

function renderReportHtml(user, report) {
  const currency = user.currency;
  const categoryRows = report.topCategories
    .map(([name, amt]) => `<tr><td style="padding:4px 0;color:#9C9B96;">${name}</td><td style="padding:4px 0;text-align:right;font-family:monospace;">${formatMoney(amt, currency)}</td></tr>`)
    .join('');

  const overBudgetHtml = report.overBudget.length > 0
    ? `<p style="color:#B85141;">⚠ Over budget in: ${report.overBudget.map((b) => b.category).join(', ')}</p>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
      <h2 style="color: #CBA24D;">Your ${report.label} summary</h2>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding:4px 0;">Spent</td><td style="padding:4px 0;text-align:right;font-family:monospace;">${formatMoney(report.spend, currency)}</td></tr>
        <tr><td style="padding:4px 0;">Income</td><td style="padding:4px 0;text-align:right;font-family:monospace;">${formatMoney(report.income, currency)}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Net</td><td style="padding:4px 0;text-align:right;font-family:monospace;font-weight:600;">${formatMoney(report.net, currency)}</td></tr>
        <tr><td style="padding:4px 0;">Saved</td><td style="padding:4px 0;text-align:right;font-family:monospace;">${formatMoney(report.saved, currency)}</td></tr>
      </table>
      ${report.topCategories.length > 0 ? `<h3 style="font-size:14px;">Top categories</h3><table style="width:100%; border-collapse: collapse; margin-bottom:16px;">${categoryRows}</table>` : ''}
      ${overBudgetHtml}
      <p style="color:#888; font-size:12px; margin-top:24px;">You're getting this because monthly report emails are turned on in Ledger Settings. You can turn them off there anytime.</p>
    </div>
  `;
}

// Sends one user's report immediately (used by both the test-send route and the
// monthly cron job below).
async function sendReportToUser(user, reference = new Date()) {
  const report = await buildReportForUser(user, reference);
  if (!report.hasActivity) return { sent: false, reason: 'no_activity' };

  await sendEmail({
    to: user.email,
    subject: `Your ${report.label} summary — Ledger`,
    html: renderReportHtml(user, report),
    text: `Your ${report.label} summary: spent ${formatMoney(report.spend, user.currency)}, income ${formatMoney(report.income, user.currency)}, net ${formatMoney(report.net, user.currency)}.`
  });
  return { sent: true };
}

// Called by the cron job in server.js on the 1st of each month — reports on the
// month that just ended, for every user who hasn't opted out.
async function sendMonthlyReportsToAllUsers() {
  const users = await User.find({ monthlyReportEmail: true });
  const results = await Promise.allSettled(users.map((u) => sendReportToUser(u)));
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.sent).length;
  console.log(`Monthly reports: sent ${sent} of ${users.length} opted-in users.`);
  return { total: users.length, sent };
}

module.exports = { sendReportToUser, sendMonthlyReportsToAllUsers, buildReportForUser };