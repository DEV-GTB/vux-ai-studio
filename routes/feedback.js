// VUX AI Feedback Route — stores bug reports and suggestions locally.
//
// No email, no SMTP, no Gmail. Reports are saved to data/feedback.jsonl
// (append-only, one per line) and retrievable via GET /api/feedback.
// The user can view all their reports in the Help page.

import { Router } from 'express';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['suggestion', 'bug']),
  message: z.string().min(1).max(5000),
  username: z.string().optional().default('Anonymous'),
});

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

// POST /api/feedback — submit a bug report or suggestion (stored locally)
router.post('/', validateBody(feedbackSchema), async (req, res) => {
  const { type, message, username } = req.body;
  const category = type === 'bug' ? 'Bug Report' : 'Suggestion';

  const record = {
    id: Date.now(),
    type,
    category,
    username,
    message,
    date: new Date().toISOString(),
  };

  try {
    await storeFeedback(record);
  } catch (error) {
    console.error('[feedback] storage failed:', error.message);
    return res.status(500).json({ error: 'Could not store feedback.' });
  }

  return res.json({ success: true, method: 'local' });
});

// GET /api/feedback — retrieve all stored feedback
router.get('/', async (_req, res) => {
  try {
    const items = await loadFeedback();
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
