const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

let transporter = null;
function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });
  }
  return transporter;
}

// Sends an email via Gmail SMTP if GMAIL_USER/GMAIL_APP_PASSWORD are configured.
// Otherwise falls back to printing it to the console — same pattern as the
// Groq/Ollama AI fallback, so local dev works with zero setup either way.
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    console.log('\n=== Email (no GMAIL_USER/GMAIL_APP_PASSWORD set — printing instead) ===');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log('========================================================================\n');
    return { sent: false, reason: 'no_credentials' };
  }

  await t.sendMail({
    from: `Ledger <${GMAIL_USER}>`,
    to,
    subject,
    html,
    text
  });
  return { sent: true };
}

module.exports = sendEmail;