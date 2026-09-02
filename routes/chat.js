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

function getIdentityResponse(messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const text = String(latestUserMessage?.content || '').toLowerCase().trim();
  if (!text) return null;

  if (/^(who are you|what are you|what is this ai|who is this ai)\??$/.test(text)) {
    return 'I am Vux AI Studio, your secure assistant for chat, coding help, and creative work.';
  }
  if (/\b(who (made|created|built|developed) you|who is your founder|who founded you)\b/.test(text)) {
    return 'Vux AI Studio was developed by the GTB community. The founders are Thariq and Azhar.';
  }
  if (/\bwho (are|is) the (co-?founders?|engineering team)\b/.test(text)) {
    return 'The Co-Founders are Sreehari K.M and Gokul. Engineering is led by Azhar and Thariq.';
  }
  return null;
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

  const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const models = configuredModel === 'gemini-2.5-flash' ? [configuredModel] : [configuredModel, 'gemini-2.5-flash'];
  let data;
  let response;

  for (const model of models) {
    response = await fetch(
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

    data = await response.json();
    if (response.ok || response.status !== 404) break;
    console.warn(`[chat] configured model ${model} was not found; trying fallback`);
  }

  if (!response.ok) {
    const err = new Error(data.error?.message || 'Chat request failed');
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  const rawText =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    "I couldn't generate a response to that — try rephrasing.";

  return scrubIdentity(rawText);
}

// POST /api/chat  { messages: [{ role: 'user'|'assistant', content: string }] }
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const identityResponse = getIdentityResponse(messages);
  if (identityResponse) return res.json({ text: identityResponse });

  if (!process.env.GEMINI_API_KEY) {
    console.error('[chat] GEMINI_API_KEY is not set on the server');
    return res.status(500).json({ error: GENERIC_ERROR.chat });
  }

  try {
    const text = await callGemini(messages);
    return res.json({ text });
  } catch (err) {
    console.error('[chat] Gemini failed:', err?.payload || err.message || err);
    const status = err?.status >= 400 ? err.status : 502;
    return res.status(status >= 500 ? 502 : status).json({ error: GENERIC_ERROR.chat });
  }
});

export default router;