// VUX AI Feedback Route — sends bug reports and suggestions to support email.
//
// Uses nodemailer with a no-reply sender address. If SMTP is not configured,
// falls back to a mailto: link so the user can still send via their own email client.

import { Router } from 'express';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['suggestion', 'bug']),
  message: z.string().min(1).max(5000),
  username: z.string().optional().default('Anonymous'),
});

// Build a nodemailer transporter. In production, set SMTP_* env vars.
// Without SMTP configured, the route returns a mailto fallback so the user
// can still send via their own email client.
function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const SUPPORT_EMAIL = 'gtbstudio369@gmail.com';
const NOREPLY_EMAIL = process.env.SMTP_USER || 'noreply@vux-ai-studio.local';

router.post('/', validateBody(feedbackSchema), async (req, res) => {
  const { type, message, username } = req.body;
  const category = type === 'bug' ? 'Bug Report' : 'Suggestion';
  const subject = `[VUX AI ${category}] from ${username}`;
  const body = [
    `Account Name: ${username}`,
    `Report Category: ${category}`,
    `Date: ${new Date().toISOString()}`,
    '',
    message,
  ].join('\n');

  // Try SMTP first
  const transporter = buildTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"VUX AI Feedback" <${NOREPLY_EMAIL}>`,
        to: SUPPORT_EMAIL,
        subject,
        text: body,
      });
      return res.json({ success: true, method: 'smtp' });
    } catch (error) {
      console.error('[feedback] SMTP failed:', error.message);
      // Fall through to mailto
    }
  }

  // Fallback: mailto: link (opens user's email client)
  const mailtoBody = encodeURIComponent(body);
  const mailtoSubject = encodeURIComponent(subject);
  const mailtoUrl = `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return res.json({
    success: true,
    method: 'mailto',
    mailtoUrl,
    note: 'SMTP not configured. Use the mailto link to send via your email client.',
  });
});

export default router;
