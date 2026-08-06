const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'AU$' };

export function formatMoney(amount, currency = 'USD') {
  const symbol = SYMBOLS[currency] || '';
  const value = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${value}`;
}

// Dates are stored as UTC midnight (JS parses date-only strings like "2026-08-06"
// from <input type="date"> as UTC). Reading them back with local getters/toLocaleDateString
// shifts the displayed day backward for any timezone behind UTC (e.g. US timezones) —
// so we always read the calendar day in UTC, not local time.
export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

// Calendar-accurate "days until this subscription's next billing date".
// The old (billingDay - today + 31) % 31 formula assumed every month has 31 days,
// which overcounts by 1-3 days in shorter months (Feb, Apr, Jun, Sep, Nov) and can
// cause upcoming-renewal alerts to be missed or mistimed.
export function daysUntilBilling(billingDay, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayMidnight = new Date(year, month, today.getDate());

  const daysInThisMonth = new Date(year, month + 1, 0).getDate();
  let target = new Date(year, month, Math.min(billingDay, daysInThisMonth));

  if (target < todayMidnight) {
    const daysInNextMonth = new Date(year, month + 2, 0).getDate();
    target = new Date(year, month + 1, Math.min(billingDay, daysInNextMonth));
  }

  return Math.round((target - todayMidnight) / 86400000);
}