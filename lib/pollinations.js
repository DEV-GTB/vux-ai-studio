// Pollinations.
//
// A free image and speech source that needs no key and no login. It is the
// only provider in the set that always works, so it is the first attempt for
// image generation and the last resort for speech.

const OLD_IMAGE_BASE = 'https://image.pollinations.ai';
const GEN_BASE = 'https://gen.pollinations.ai';
const TEXT_BASE = 'https://text.pollinations.ai';

// Get API key from environment
function getApiKey() {
  return process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY || '';
}

export const POLLINATION_IMAGE_MODELS = ['flux', 'turbo', 'kontext'];
export const POLLINATION_AUDIO_MODELS = ['openai', 'kokoro', 'piper'];

/**
 * Generates an image from a prompt.
 *
 * @param {object} input
 * @param {string} input.prompt
 * @param {number} [input.width]
 * @param {number} [input.height]
 * @param {string} [input.model]
 * @param {number} [input.seed]
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
export async function generatePollinationsImage({
  prompt,
  width = 1024,
  height = 1024,
  model = 'flux',
  seed,
  nologo = true,
} = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error('A prompt is required.');
  }

  const apiKey = getApiKey();
  const useGenApi = Boolean(apiKey);

  // Use the newer gen.pollinations.ai endpoint with API key for watermark-free images
  // Fall back to the old image.pollinations.ai endpoint without key (may have watermark)
  const query = new URLSearchParams({
    width: String(width),
    height: String(height),
  });
  if (seed !== undefined && seed !== null) query.set('seed', String(seed));

  let url;
  if (useGenApi) {
    // New API - uses publisher/model format, watermark-free with API key
    query.set('model', 'black-forest-labs/flux.1-schnell');
    url = `${GEN_BASE}/image/${encodeURIComponent(String(prompt).trim())}?${query}`;
  } else {
    // Old API - may have watermark without key, but nologo=true helps
    query.set('model', String(model));
    query.set('nologo', nologo ? 'true' : 'false');
    url = `${OLD_IMAGE_BASE}/prompt/${encodeURIComponent(String(prompt).trim())}?${query}`;
  }

  const headers = {};
  if (useGenApi && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`The free image service returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error('The free image service did not return an image.');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('The free image service returned an empty image.');

  return { buffer, contentType };
}

/**
 * Speaks a line of text.
 *
 * @param {object} input
 * @param {string} input.text
 * @param {string} [input.voice]
 * @param {string} [input.model]
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
export async function generatePollinationsSpeech({
  text,
  voice = 'alloy',
  model = 'openai',
} = {}) {
  if (!text || !String(text).trim()) {
    throw new Error('A text is required.');
  }

  const url = `${TEXT_BASE}/${encodeURIComponent(model)}/${encodeURIComponent(voice)}/${encodeURIComponent(String(text).trim())}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`The free speech service returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('The free speech service returned empty audio.');

  return { buffer, contentType: contentType || 'audio/mpeg' };
}

export function hasPollinations() {
  // Always available: it needs no credentials.
  return true;
}
