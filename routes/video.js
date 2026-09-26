import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { GENERIC_ERROR } from '../lib/identity.js';

const router = Router();

async function downloadVideo(videoOutput, outputPath) {
  if (!videoOutput) return null;

  if (videoOutput.data) {
    const videoBuffer = Buffer.from(videoOutput.data, 'base64');
    return videoBuffer.toString('base64');
  }
  return null;
}

// POST /api/video  { prompt: string }
router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (!process.env.GEMINI_API_KEY) {
    console.error('[video] GEMINI_API_KEY is not set on the server');
    return res.status(500).json({ error: GENERIC_ERROR.video });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      vertexai: false,
    });

    const generationConfig = {
      max_output_tokens: 65536,
      thinking_level: 'high',
      video_config: {
        task: 'unspecified',
      },
      top_p: 0.95,
    };

    const interaction = await ai.interactions.create({
      model: 'models/gemini-omni-flash-preview',
      input: prompt,
      generation_config: generationConfig,
      response_modalities: ['video'],
      response_format: {
        type: 'video',
        duration: '10s',
      },
    });

    let videoData = null;
    if (interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output' && step.content) {
          for (const part of step.content) {
            if (part.type === 'text') {
              console.log(part.text);
            }
            else if (part.type === 'video') {
              videoData = await downloadVideo(ai, part, 'output.mp4');
              break;
            }
          }
        }
      }
    }

    if (!videoData) {
      console.error('[video] No video data in response');
      return res.status(502).json({ error: GENERIC_ERROR.video });
    }

    res.json({ video: `data:video/mp4;base64,${videoData}` });
  } catch (err) {
    console.error('[video] request failed:', err);
    res.status(502).json({ error: GENERIC_ERROR.video });
  }
});

export default router;