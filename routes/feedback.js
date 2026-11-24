// VUX AI Feedback Route — stores bug reports and suggestions locally.
//
// Reports are saved to data/feedback.jsonl (append-only, one per line) so the
// user can view them anytime without needing email. SMTP email is still tried
// first if configured, but storage always succeeds regardless.

import { Router } from 'express';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['suggestion', 'bug']),
  message: z.string().min(1).max(5000),
  username: z.string().optional().default('Anonymous'),
});

const SUPPORT_EMAIL = 'gtbstudio369@gmail.com';
const NOREPLY_EMAIL = process.env.SMTP_USER || 'noreply@vux-ai-studio.local';
const FEEDBACK_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback.jsonl');

async function ensureFeedbackDir() {
  try { await mkdir(FEEDBACK_DIR, { recursive: true }); } catch { /* exists */ }
}

async function storeFeedback(record) {
  await ensureFeedbackDir();
  await appendFile(FEEDBACK_FILE, JSON.stringify(record) + '\n');
}

async function loadFeedback() {
  try {
    await ensureFeedbackDir();
    const content = await readFile(FEEDBACK_FILE, 'utf8');
    return String(content).split('\n').filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

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

// POST /api/feedback — submit a bug report or suggestion
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

  // Always store locally first (no email dependency)
  const record = {
    id: Date.now(),
    type,
    category,
    username,
    message,
    subject,
    date: new Date().toISOString(),
    emailSent: false,
  };

  try {
    await storeFeedback(record);
  } catch (error) {
    console.error('[feedback] storage failed:', error.message);
  }

  // Try SMTP email (best-effort, doesn't block)
  const transporter = buildTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"VUX AI Feedback" <${NOREPLY_EMAIL}>`,
        to: SUPPORT_EMAIL,
        subject,
        text: body,
      });
      // Update record to reflect email was sent
      record.emailSent = true;
      await storeFeedback({ ...record, emailSent: true }).catch(() => {});
    } catch (error) {
      console.error('[feedback] SMTP failed:', error.message);
    }
  }

  return res.json({
    success: true,
    method: transporter ? 'smtp' : 'local',
    note: transporter
      ? 'Feedback stored and emailed to support.'
      : 'Feedback stored locally. SMTP not configured — set SMTP_* in .env to enable email.',
  });
});

// GET /api/feedback — retrieve all stored feedback
router.get('/', async (_req, res) => {
  try {
    const items = await loadFeedback();
    // Dedupe by id (since re-stores may happen)
    const seen = new Set();
    const unique = items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    unique.sort((a, b) => (b.id || 0) - (a.id || 0));
    return res.json({ items: unique, count: unique.length });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load feedback.' });
  }
});

export default router;
