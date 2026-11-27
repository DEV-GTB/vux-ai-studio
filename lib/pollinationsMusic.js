// Pollinations music generation (free with API key, no watermark).
//
// Uses the gen.pollinations.ai/audio endpoint for music generation.
// Model: google/lyria-3.5 (MP3, ~30s, described in prompt)
// Fallback: google/lyria-3-clip-preview (fixed 30-second MP3 clip)

const AUDIO_BASE = 'https://gen.pollinations.ai/audio';

export const POLLINATION_MUSIC_MODELS = ['google/lyria-3.5', 'google/lyria-3-clip-preview'];

export async function generatePollinationsMusic(prompt, options = {}) {
  const model = options.model || 'google/lyria-3.5';
  const apiKey = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY || '';
  const params = new URLSearchParams();
  params.set('model', model);
  if (apiKey) params.set('key', apiKey);

  const url = `${AUDIO_BASE}/${encodeURIComponent(String(prompt).trim())}?${params}`;
  const headers = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`The music service returned HTTP ${response.status}.`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('audio/')) {
    throw new Error('The music service did not return audio.');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('The music service returned empty audio.');
  return { buffer, contentType };
}
