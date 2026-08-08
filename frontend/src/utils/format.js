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

// Lightweight, dependency-free "Browser on OS" label for a session's stored
// user-agent string, used on the Settings > Active sessions list.
export function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;

  let os = 'Unknown OS';
  if (/ipad/i.test(ua)) os = 'iPad';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x/i.test(ua)) os = 'Mac';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/crios\//i.test(ua)) browser = 'Chrome';
  else if (/fxios\//i.test(ua)) browser = 'Firefox';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}