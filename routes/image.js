import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { GENERIC_ERROR } from '../lib/identity.js';

const router = Router();

// POST /api/image  { prompt: string }
router.post('/', async (req, res) => {
  const { prompt, aspectRatio = '1:1', quality = 'high', stylePreset = 'photorealistic' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (!process.env.GEMINI_API_KEY) {
    console.error('[image] GEMINI_API_KEY is not set on the server');
    return res.status(500).json({ error: GENERIC_ERROR.image });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      vertexai: false,
    });

    const enhancedPrompt = `${prompt}. Style: ${stylePreset}. Quality: ${quality}. Aspect ratio: ${aspectRatio}. Return one generated image.`;
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview',
      contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    let imageData = null;
    let responseText = '';

    for (const candidate of result?.candidates || []) {
      for (const part of candidate?.content?.parts || []) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
        }
        if (part.text) {
          responseText = part.text;
        }
      }
    }

    if (!imageData) {
      console.error('[image] No image data in response', responseText || result);
      return res.status(502).json({ error: GENERIC_ERROR.image });
    }

    res.json({ image: `data:image/png;base64,${imageData}` });
  } catch (err) {
    console.error('[image] request failed:', err?.message || err);
    const status = err?.status === 429 ? 429 : 502;
    const error = status === 429
      ? 'Image generation quota is unavailable for this Gemini project. Check Google AI Studio billing, quota, and image-model access.'
      : GENERIC_ERROR.image;
    res.status(status).json({ error });
  }
});

export default router;