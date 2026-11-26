// VUX AI Text-to-Speech route.
//
//   POST /api/tts  { text, voice?, language? }  -> { audio: 'data:audio/...;base64,...' }
//
// Uses the unified model layer (Cloudflare, Groq, fal) with automatic fallback.

import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody, promptBodySchema } from '../lib/requestValidation.js';
import { getCloudflareAccounts, getModelList, runCloudflareModel, extractMediaPayload } from '../lib/cloudflare.js';
import { generate, CAPABILITY } from '../lib/aiProviders.js';

const router = Router();

router.post('/', validateBody(promptBodySchema), async (req, res) => {
  const { text, voice, language } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'A text is required.' });
  }

  const request = { text: String(text).trim(), voice: voice || 'alloy', language: language || 'en' };

  try {
    const { result, provider, model } = await generate(CAPABILITY.TTS, {
      text: request.text,
      voice: request.voice,
      account: getCloudflareAccounts()[0],
      bodyFor: (modelName) => {
        if (modelName.startsWith('@cf/deepgram')) return { text: request.text };
        if (modelName === '@cf/myshell-ai/melotts') return { text: request.text };
        if (modelName === 'google/gemini-3.8-flash-lite-tts') return { text: request.text };
        if (modelName === 'elevenlabs/eleven-v3') return { text: request.text, voice: request.voice };
        return { text: request.text };
      },
    });
    res.setHeader('X-Vux-AI-Provider', provider || 'unknown');
    res.setHeader('X-Vux-AI-Model', model || provider || 'unknown');
    const audioBase64 = result.buffer.toString('base64');
    return res.json({ audio: `data:${result.contentType || 'audio/mpeg'};base64,${audioBase64}` });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    return res.status(status).json({ error: status === 429 ? 'Speech synthesis is busy. Please try again shortly.' : GENERIC_ERROR.chat });
  }
});

export default router;
