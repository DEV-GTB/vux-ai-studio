import { Router } from 'express';
import { GENERIC_ERROR } from '../lib/identity.js';
import { validateBody, promptBodySchema } from '../lib/requestValidation.js';
import { getCloudflareAccounts, getModelList, runCloudflareModel, extractImagePayload, extractAudioPayload, extractVideoPayload, extractTranscription, extractGeneratedText, extractEmbeddings, extractMediaPayload } from '../lib/cloudflare.js';
import { generate, CAPABILITY } from '../lib/aiProviders.js';
import { generatePollinationsMusic } from '../lib/pollinationsMusic.js';

const router = Router();

function getCloudflareMusicModels() {
  return getModelList('music');
}

// Music requests prefer the secondary Cloudflare account, like every other
// request that is not an image.
function buildCloudflareMusicRequest(modelName, input) {
  const body = { prompt: input.prompt };

  if (modelName === 'elevenlabs/music-v2') {
    if (input.musicLengthMs) body.music_length_ms = input.musicLengthMs;
    if (input.forceInstrumental) body.force_instrumental = true;
    if (input.outputFormat) body.output_format = input.outputFormat;
  } else {
    if (input.isInstrumental) body.is_instrumental = true;
    if (input.lyricsOptimizer) body.lyrics_optimizer = true;
  }
  return body;
}

async function generateWithCloudflareMusic(modelName, input, account) {
  const data = await runCloudflareModel(modelName, buildCloudflareMusicRequest(modelName, input), account);
  const { base64, contentType } = extractMediaPayload(data, { contentType: 'audio/mpeg' });
  if (!base64) throw new Error('The music service returned no audio.');
  return { buffer: Buffer.from(base64, 'base64'), contentType };
}

function sendMusicError(res, error) {
  const failureText = String(error?.message || '').toLowerCase();
  console.error('[music] request failed:', error?.status || failureText.slice(0, 180) || 'unknown error');

  // "No route for that URI" means the account does not offer the model at
  // all. Saying so is far more useful than a generic failure.
  const modelUnavailable = failureText.includes('no route for that uri')
    || failureText.includes('not available on the workers free plan');

  if (modelUnavailable) {
    return res.status(503).json({
      error: 'Music generation is not available on the configured account. Enable a music model for it, or set CLOUDFLARE_MUSIC_MODELS to one the account can reach.',
    });
  }

  const status = error?.status === 429 ? 429 : 502;
  return res.status(status).json({ error: status === 429 ? 'Music generation is busy. Please try again shortly.' : GENERIC_ERROR.chat });
}

// POST /api/music  { prompt, musicLengthMs, forceInstrumental, outputFormat, isInstrumental, lyricsOptimizer }
router.post('/', validateBody(promptBodySchema), async (req, res) => {
  const {
    prompt,
    musicLengthMs,
    forceInstrumental,
    outputFormat,
    isInstrumental,
    lyricsOptimizer,
  } = req.body || {};
  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: 'A prompt is required.' });
  }
  if (!getCloudflareAccounts().length && !process.env.FAL_API_KEY) {
    return res.status(503).json({ error: 'Music generation is not configured. Add Cloudflare API credentials or a fal API key to the server environment.' });
  }

  const request = {
    prompt: String(prompt).trim(),
    musicLengthMs: musicLengthMs || undefined,
    forceInstrumental: forceInstrumental === true,
    outputFormat,
    isInstrumental: isInstrumental === true,
    lyricsOptimizer: lyricsOptimizer === true,
  };

  try {
    const { result, provider, model } = await generate(CAPABILITY.MUSIC, {
      account: getCloudflareAccounts()[0],
      bodyFor: (modelName) => buildCloudflareMusicRequest(modelName, request),
    });
    res.setHeader('X-Vux-AI-Provider', provider || 'unknown');
    res.setHeader('X-Vux-AI-Model', model || provider || 'unknown');
    const audioBase64 = result.buffer.toString('base64');
    return res.json({ audio: `data:${result.contentType || 'audio/mpeg'};base64,${audioBase64}` });
  } catch (error) {
    // Fall back to Pollinations free music generation.
    try {
      const result = await generatePollinationsMusic(request.prompt, { model: 'google/lyria-3.5' });
      res.setHeader('X-Vux-AI-Provider', 'Pollinations');
      res.setHeader('X-Vux-AI-Model', 'google/lyria-3.5');
      const audioBase64 = result.buffer.toString('base64');
      return res.json({ audio: `data:${result.contentType || 'audio/mpeg'};base64,${audioBase64}` });
    } catch (pollError) {
      console.error('[music] Pollinations fallback failed:', pollError?.message);
      return sendMusicError(res, error);
    }
  }
});

export default router;
