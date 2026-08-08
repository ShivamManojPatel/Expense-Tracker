const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'AU$' };

function formatMoney(amount, currency = 'USD') {
  const symbol = SYMBOLS[currency] || '';
  const value = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${value}`;
}

module.exports = { formatMoney };