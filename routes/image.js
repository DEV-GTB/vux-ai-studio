import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { GENERIC_ERROR } from '../lib/identity.js';

const router = Router();

// POST /api/image  { prompt: string }
router.post('/', async (req, res) => {
  const { prompt } = req.body;
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

    const generationConfig = {
      temperature: 1,
      max_output_tokens: 65536,
      top_p: 0.95,
      thinking_level: 'minimal',
      image_config: {
        imageSize: '1K',
      },
    };

    const interaction = await ai.interactions.create({
      model: 'models/gemini-3.1-flash-lite-image',
      input: prompt,
      generation_config: generationConfig,
      response_modalities: ['image', 'text'],
    });

    let imageData = null;
    if (interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output' && step.content) {
          for (const part of step.content) {
            if (part.type === 'text') {
              console.log(part.text);
            }
            else if (part.type === 'image') {
              imageData = part.data;
              break;
            }
          }
        }
      }
    }

    if (!imageData) {
      console.error('[image] No image data in response');
      return res.status(502).json({ error: GENERIC_ERROR.image });
    }

    res.json({ image: `data:image/png;base64,${imageData}` });
  } catch (err) {
    console.error('[image] request failed:', err);
    res.status(502).json({ error: GENERIC_ERROR.image });
  }
});

export default router;