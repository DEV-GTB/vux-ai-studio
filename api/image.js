import { GoogleGenAI } from '@google/genai';
import { GENERIC_ERROR } from '../lib/identity.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, aspectRatio = '1:1', quality = 'high', stylePreset = 'photorealistic' } = req.body || {};
  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('[image] GEMINI_API_KEY is not set on the server');
    return res.status(500).json({ error: GENERIC_ERROR.image });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, vertexai: false });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview',
      contents: [{
        role: 'user',
        parts: [{ text: `${prompt}. Style: ${stylePreset}. Quality: ${quality}. Aspect ratio: ${aspectRatio}. Return one generated image.` }],
      }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const imagePart = result?.candidates?.flatMap((candidate) => candidate?.content?.parts || [])
      .find((part) => part.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      console.error('[image] no image data returned');
      return res.status(502).json({ error: GENERIC_ERROR.image });
    }

    return res.status(200).json({
      image: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
    });
  } catch (error) {
    console.error('[image] request failed:', error?.message || error);
    if (error?.status === 429) {
      return res.status(429).json({ error: 'Image creation is temporarily unavailable because this account has reached its image limit. Please try again later.' });
    }
    return res.status(502).json({ error: GENERIC_ERROR.image });
  }
}
