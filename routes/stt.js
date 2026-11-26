// VUX AI Speech-to-Text route.
//
//   POST /api/stt  { audio: 'data:audio/...;base64,...' }  -> { text: 'transcribed text' }
//
// Uses the unified model layer (Cloudflare, Groq) with automatic fallback.

import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import { getCloudflareAccounts, getModelList, runCloudflareModel, extractTranscription } from '../lib/cloudflare.js';
import { generate, CAPABILITY } from '../lib/aiProviders.js';

const router = Router();

const sttBodySchema = z.object({
  audio: z.string().min(1),
}).passthrough();

router.post('/', validateBody(sttBodySchema), async (req, res) => {
  const { audio } = req.body || {};
  if (!audio || !String(audio).trim()) {
    return res.status(400).json({ error: 'Audio data is required.' });
  }

  // Decode the base64 audio from the data URL
  let audioBuffer;
  try {
    const base64 = String(audio).replace(/^data:[^;]+;base64,/, '');
    audioBuffer = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid audio data.' });
  }

  try {
    const { result, provider, model } = await generate(CAPABILITY.STT, {
      audioBuffer,
      account: getCloudflareAccounts()[0],
      bodyFor: (modelName) => {
        if (modelName === '@cf/openai/whisper-large-v3-turbo' || modelName === '@cf/openai/whisper-tiny-en') {
          return { audio: audioBuffer };
        }
        if (modelName === 'openai/gpt-4o-transcribe') {
          return { file: audio };
        }
        if (modelName === 'xai/grok-stt') {
          return { url: audio };
        }
        if (modelName === 'assemblyai/universal-3.5-pro' || modelName === 'assemblyai/universal-3-pro') {
          return { audio_url: audio };
        }
        return { audio: audioBuffer };
      },
    });
    res.setHeader('X-Vux-AI-Provider', provider || 'unknown');
    res.setHeader('X-Vux-AI-Model', model || provider || 'unknown');
    return res.json({ text: result.text || '' });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    return res.status(status).json({ error: status === 429 ? 'Speech recognition is busy. Please try again shortly.' : GENERIC_ERROR.chat });
  }
});

export default router;
