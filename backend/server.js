require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const { sendMonthlyReportsToAllUsers } = require('./utils/monthlyReport');

connectDB();

const app = express();

// Render sits behind a reverse proxy — without this, req.ip returns the proxy's
// internal address instead of the real client IP (needed for session tracking).
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/search', require('./routes/search'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/reports', require('./routes/reports'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// In-process schedule: fires at 8am UTC on the 1st of each month, but ONLY while
// this server happens to be awake — Render's free tier sleeps after ~15 min idle,
// so this alone isn't reliable in production there. See /api/reports/run-monthly
// for the external-scheduler approach that actually works around that.
cron.schedule('0 8 1 * *', () => {
  console.log('Running scheduled monthly reports...');
  sendMonthlyReportsToAllUsers().catch((err) => console.error('Monthly report cron failed:', err));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));