import { Router } from 'express';
import { IDENTITY_PROMPT, scrubIdentity, GENERIC_ERROR } from '../lib/identity.js';

const router = Router();

const FORCE_ENGLISH_INSTRUCTIONS = `
You are Vux AI Studio.
Reply in English only, even if the user writes in another language.
For non-coding requests, add this instruction to the request: "Make it in English."
Keep the answer clear, helpful, concise, and practical.
`;

function looksLikeCodingRequest(text = '') {
  const value = String(text || '').toLowerCase();
  if (!value.trim()) return false;

  const codeSignals = [
    'code', 'coding', 'debug', 'fix', 'bug', 'function', 'script', 'program', 'app',
    'html', 'css', 'javascript', 'react', 'node', 'python', 'api', 'sql', 'json',
    'class ', 'import ', 'export ', 'const ', 'let ', 'if (', 'for (', 'while (',
    '```', '<html', '</html>', 'console.log', 'return ', 'throw ', 'error'
  ];

  return codeSignals.some((signal) => value.includes(signal));
}

function buildMessages(messages) {
  const normalizedMessages = messages.map((m) => {
    if (m.role !== 'user') {
      return {
        role: 'assistant',
        content: m.content,
      };
    }

    const content = String(m.content || '');
    const finalContent = looksLikeCodingRequest(content)
      ? content
      : `${content}\n\nMake it in English.`;

    return {
      role: 'user',
      content: finalContent,
    };
  });

  return [
    { role: 'system', content: `${IDENTITY_PROMPT}\n\n${FORCE_ENGLISH_INSTRUCTIONS}` },
    ...normalizedMessages,
  ];
}

function isProviderLimitError(status, payload = {}) {
  if (status === 429 || status === 503 || status === 500) return true;
  const text = `${payload?.error?.message || ''} ${payload?.message || ''}`.toLowerCase();
  return /quota|rate limit|limit reached|temporarily unavailable|overloaded|busy|429|too many requests/i.test(text);
}

async function callGemini(messages) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${IDENTITY_PROMPT}\n\n${FORCE_ENGLISH_INSTRUCTIONS}` }] },
        contents,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error?.message || 'Gemini request failed');
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  const rawText =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    "I couldn't generate a response to that — try rephrasing.";

  return scrubIdentity(rawText);
}

async function callDeepSeek(messages) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: buildMessages(messages),
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error?.message || 'DeepSeek request failed');
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  const rawText = data.choices?.[0]?.message?.content || "I couldn't generate a response to that — try rephrasing.";
  return scrubIdentity(rawText);
}

// POST /api/chat  { messages: [{ role: 'user'|'assistant', content: string }] }
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  if (!hasGemini && !hasDeepSeek) {
    console.error('[chat] no backend key is set on the server');
    return res.status(500).json({ error: GENERIC_ERROR.chat });
  }

  const providers = [];
  if (hasGemini) providers.push('gemini');
  if (hasDeepSeek) providers.push('deepseek');

  let lastError = null;

  for (const provider of providers) {
    try {
      if (provider === 'gemini') {
        const text = await callGemini(messages);
        return res.json({ text });
      }

      const text = await callDeepSeek(messages);
      return res.json({ text });
    } catch (err) {
      lastError = err;
      const providerName = provider === 'gemini' ? 'Gemini' : 'DeepSeek';
      console.error(`[chat] ${providerName} failed:`, err?.payload || err.message || err);

      if (provider === 'gemini' && hasDeepSeek && isProviderLimitError(err.status, err.payload)) {
        console.warn('[chat] Gemini hit a limit; falling back to DeepSeek.');
        continue;
      }

      if (provider === 'gemini' && hasDeepSeek) {
        console.warn('[chat] Gemini failed; falling back to DeepSeek.');
        continue;
      }

      break;
    }
  }

  const status = lastError?.status >= 400 ? lastError.status : 502;
  return res.status(status >= 500 ? 502 : status).json({ error: GENERIC_ERROR.chat });
});

export default router;