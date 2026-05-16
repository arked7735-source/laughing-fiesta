// Handles Discord webhooks + EmailJS notifications
// All keys are server-side only

async function notifyDiscord(embed) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'VISURA Bot',
        embeds: [{ ...embed, footer: { text: 'VISURA Payment System' } }]
      })
    });
  } catch (e) {
    console.warn('[Discord] Notification failed:', e.message);
  }
}

async function notifyEmail({ subject, html }) {
  // Uses Nodemailer with Gmail SMTP
  const nodemailer = require('nodemailer');
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"VISURA Studio" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject,
      html
    });
  } catch (e) {
    console.warn('[Email] Notification failed:', e.message);
  }
}

module.exports = { notifyDiscord, notifyEmail };
