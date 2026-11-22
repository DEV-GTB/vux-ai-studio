// Live Gemini probe: tests the configured model and candidate fallbacks.
import 'dotenv/config';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 60000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function probeGemini(model) {
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in three words.' }] }],
    }),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.error || 'Gemini request failed');
    error.status = response.status;
    throw error;
  }
  const output = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(' ').trim();
  if (!output) throw new Error('empty response');
  return output;
}

const models = ['gemini-3.8-flash', 'gemini-3.6-flash'];
for (const model of models) {
  console.log(`\n--- probing Gemini model: ${model} ---`);
  try {
    const output = await withTimeout(probeGemini(model));
    console.log('STATUS: PASS');
    console.log('ANSWER:', JSON.stringify(output));
  } catch (error) {
    console.log('STATUS: FAIL');
    console.log('ERROR:', error?.status || 'timeout', error?.message || String(error));
  }
}
process.exit(0);
