// Finds the most recent occurrence of billingDay on/before `today` (UTC calendar
// math, clamped to each month's actual length).
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

// Weekly/Bi-weekly/Yearly all recur every N days starting from startDate — this
// finds the most recent occurrence of that interval on/before `today`.
function currentAnchoredCycleStart(startDate, intervalDays, today) {
  const start = new Date(startDate);
  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const intervalMs = intervalDays * 86400000;

  if (todayMs <= startMs) return new Date(startMs);

  const cyclesElapsed = Math.floor((todayMs - startMs) / intervalMs);
  return new Date(startMs + cyclesElapsed * intervalMs);
}

const ANCHORED_INTERVAL_DAYS = { Weekly: 7, 'Bi-weekly': 14, Yearly: 365 };

function isPaidThisCycle(sub, now = new Date()) {
  if (!sub.lastPaidDate) return false;
  const paidAt = new Date(sub.lastPaidDate);

  if (sub.billingCycle === 'Monthly') {
    return paidAt >= currentMonthlyCycleStart(sub.billingDay, now);
  }

  const intervalDays = ANCHORED_INTERVAL_DAYS[sub.billingCycle] || ANCHORED_INTERVAL_DAYS.Weekly;
  return paidAt >= currentAnchoredCycleStart(sub.startDate, intervalDays, now);
}

module.exports = { isPaidThisCycle, currentMonthlyCycleStart, currentAnchoredCycleStart };