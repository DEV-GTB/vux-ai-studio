// VUX AI Speech-to-Text route.
//
//   POST /api/stt  { audio: 'data:audio/...;base64,...' }  -> { text: 'transcribed text' }
//
// Uses Groq Whisper (free tier) with fallback to Cloudflare models.

import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody } from '../lib/requestValidation.js';
import { z } from 'zod';
import { hasGroq, callGroqTranscription } from '../lib/llama-whisper.js';

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

  if (audioBuffer.length < 100) {
    return res.status(400).json({ error: 'Audio data is too short. Please provide a longer recording.' });
  }

  if (!hasGroq()) {
    return res.status(503).json({ error: 'Speech recognition is not configured. Add a GROQ_API_KEY to the server environment.' });
  }

  try {
    const text = await callGroqTranscription(audioBuffer, 'audio.wav', { model: 'whisper-large-v3-turbo' });
    res.setHeader('X-Vux-AI-Provider', 'Groq');
    res.setHeader('X-Vux-AI-Model', 'whisper-large-v3-turbo');
    return res.json({ text });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    return res.status(status).json({ error: status === 429 ? 'Speech recognition is busy. Please try again shortly.' : GENERIC_ERROR.chat });
  }
});

export default router;
