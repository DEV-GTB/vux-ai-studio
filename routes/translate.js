// VUX AI Translation route.
//
//   POST /api/translate  { text, source_lang?, target_lang? }  -> { text: 'translated text' }
//
// Uses Cloudflare Workers AI @cf/meta/m2m100-1.2b (free, no key needed).

import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
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

  const accounts = getCloudflareAccounts();
  if (!accounts.length) {
    return res.status(503).json({ error: 'Translation is not configured. Add Cloudflare API credentials.' });
  }

  try {
    const payload = await runCloudflareModel('@cf/meta/m2m100-1.2b', {
      text: String(text).trim(),
      source_lang: String(source_lang || 'english').trim(),
      target_lang: String(target_lang).trim(),
    }, accounts[0]);
    const translated = payload?.result?.translated_text || payload?.result?.text || payload?.translated_text || payload?.text;
    if (!translated) throw new Error('The translation service returned no text.');
    res.setHeader('X-Vux-AI-Provider', 'Cloudflare');
    res.setHeader('X-Vux-AI-Model', '@cf/meta/m2m100-1.2b');
    return res.json({ text: translated });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    return res.status(status).json({ error: status === 429 ? 'Translation is busy. Please try again shortly.' : GENERIC_ERROR.chat });
  }
});

export default router;
