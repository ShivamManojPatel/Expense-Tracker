// Finds the most recent occurrence of billingDay on/before `today` (UTC calendar
// math, clamped to each month's actual length — same approach as the frontend's
// daysUntilBilling, mirrored here since this needs to run server-side).
function currentMonthlyCycleStart(billingDay, today) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInThisMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const effectiveDay = Math.min(billingDay, daysInThisMonth);
  const thisMonthBillingDate = new Date(Date.UTC(year, month, effectiveDay));

  if (today >= thisMonthBillingDate) return thisMonthBillingDate;

  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevEffectiveDay = Math.min(billingDay, daysInPrevMonth);
  return new Date(Date.UTC(year, month - 1, prevEffectiveDay));
}

// Weekly/Yearly subscriptions only store a day-of-month (not a weekday or a
// billing month), so "current cycle" for those is approximated as a rolling
// window rather than an exact calendar cycle — good enough for a "paid?" badge
// without requiring a bigger data model change.
const CYCLE_WINDOW_MS = { Weekly: 7 * 86400000, Yearly: 365 * 86400000 };

function isPaidThisCycle(sub, now = new Date()) {
  if (!sub.lastPaidDate) return false;
  const paidAt = new Date(sub.lastPaidDate);

  if (sub.billingCycle === 'Monthly') {
    return paidAt >= currentMonthlyCycleStart(sub.billingDay, now);
  }
  const windowMs = CYCLE_WINDOW_MS[sub.billingCycle] || CYCLE_WINDOW_MS.Weekly;
  return now.getTime() - paidAt.getTime() <= windowMs;
}

module.exports = { isPaidThisCycle };