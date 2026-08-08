const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendReportToUser, sendMonthlyReportsToAllUsers } = require('../utils/monthlyReport');

// POST /api/reports/send-test — sends the current user their own last-month
// report right now, regardless of the monthlyReportEmail preference, so they
// can check it looks right without waiting for the 1st of the month.
router.post('/send-test', protect, async (req, res) => {
  try {
    const result = await sendReportToUser(req.user);
    if (!result.sent) {
      return res.json({ message: "No transactions last month, so there's nothing to report yet." });
    }
    res.json({ message: 'Test report sent — check your inbox (and spam folder).' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reports/run-monthly — sends the monthly report to every opted-in user.
// Not protected by a user login (this isn't a per-user action) — instead requires
// a shared secret header, so an external scheduler (e.g. cron-job.org) can call it
// once a month. This matters specifically because Render's free tier spins the
// server down after ~15 min idle; an in-process cron schedule won't fire while
// asleep, but an incoming HTTP request like this one wakes the server up first.
router.post('/run-monthly', async (req, res) => {
  try {
    if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const result = await sendMonthlyReportsToAllUsers();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;