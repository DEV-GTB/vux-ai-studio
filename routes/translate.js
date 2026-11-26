// VUX AI Translation route.
//
//   POST /api/translate  { text, source_lang?, target_lang? }  -> { text: 'translated text' }
//
// Uses Gemini (free tier) for translation, with Groq as fallback.
// Cloudflare Workers AI @cf/meta/m2m100-1.2b is used if available.

import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import { callGeminiText, getGeminiModel, hasGeminiKey } from '../lib/gemini-flash.js';
import { callGroq } from '../lib/llama-whisper.js';
import { getCloudflareAccounts, runCloudflareModel } from '../lib/cloudflare.js';

const router = Router();

const translateBodySchema = z.object({
  text: z.string().min(1),
  source_lang: z.string().optional().default('english'),
  target_lang: z.string().min(1),
}).passthrough();

router.post('/', validateBody(translateBodySchema), async (req, res) => {
  const { text, source_lang, target_lang } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Text is required.' });
  }
  if (!target_lang || !String(target_lang).trim()) {
    return res.status(400).json({ error: 'Target language is required.' });
  }

  const srcLang = String(source_lang || 'english').trim();
  const tgtLang = String(target_lang).trim();
  const inputText = String(text).trim();

  const systemPrompt = `You are a professional translator. Translate the following text from ${srcLang} to ${tgtLang}. Return ONLY the translated text, nothing else. Do not add explanations, notes, or formatting.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: inputText },
  ];

  // Try Gemini first
  if (hasGeminiKey()) {
    try {
      const model = getGeminiModel();
      const translated = await callGeminiText(messages, { model });
      if (translated && translated.trim()) {
        res.setHeader('X-Vux-AI-Provider', 'Gemini');
        res.setHeader('X-Vux-AI-Model', model);
        return res.json({ text: translated.trim() });
      }
    } catch (error) {
      console.warn('[translate] Gemini failed:', error?.message);
    }
  }

  // Try Groq
  try {
    const translated = await callGroq(messages);
    if (translated && translated.trim()) {
      res.setHeader('X-Vux-AI-Provider', 'Groq');
      res.setHeader('X-Vux-AI-Model', 'qwen/qwen3.8-27b');
      return res.json({ text: translated.trim() });
    }
  } catch (error) {
    console.warn('[translate] Groq failed:', error?.message);
  }

  // Try Cloudflare
  const accounts = getCloudflareAccounts();
  if (accounts.length) {
    try {
      const payload = await runCloudflareModel('@cf/meta/m2m100-1.2b', {
        text: inputText,
        source_lang: srcLang,
        target_lang: tgtLang,
      }, accounts[0]);
      const translated = payload?.result?.translated_text || payload?.result?.text || payload?.translated_text || payload?.text;
      if (translated) {
        res.setHeader('X-Vux-AI-Provider', 'Cloudflare');
        res.setHeader('X-Vux-AI-Model', '@cf/meta/m2m100-1.2b');
        return res.json({ text: translated.trim() });
      }
    } catch (error) {
      console.warn('[translate] Cloudflare failed:', error?.message);
    }
  }

  return res.status(502).json({ error: GENERIC_ERROR.chat });
});

export default router;
