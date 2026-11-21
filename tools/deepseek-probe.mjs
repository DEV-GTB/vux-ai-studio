// Live DeepSeek probe: mirrors lib/providers.js callDeepSeek exactly.
import 'dotenv/config';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';
const TIMEOUT_MS = 120000;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function probeDeepSeek(model, messages) {
  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, thinking: { type: 'enabled' }, reasoning_effort: 'high', stream: false }),
  });
  const body = await response.text();
  let data = {};
  try { data = body ? JSON.parse(body) : {}; } catch { data = {}; }

  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.error || 'Chat request failed');
    error.status = response.status;
    throw error;
  }
  const content = data?.choices?.[0]?.message?.content;
  const reasoning = data?.choices?.[0]?.message?.reasoning_content;
  const text = (typeof content === 'string' ? content : Array.isArray(content) ? content.map((p) => typeof p === 'string' ? p : p?.text || '').join('\n') : '').trim();
  const reasoningText = (typeof reasoning === 'string' ? reasoning : '').trim();
  if (!text) throw new Error(`Empty response. reasoning_content was: ${reasoningText.slice(0, 200) || '(none)'}`);
  return { text, reasoningText, raw: data };
}

const messages = [
  { role: 'system', content: 'You are VUX AI. Reply in English only. Keep the answer clear and concise.' },
  { role: 'user', content: 'Say hello in three words.' },
];

console.log('DEEPSEEK_API_KEY set:', Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-your_deepseek_api_key_here'));
console.log('DEEPSEEK_MODEL:', process.env.DEEPSEEK_MODEL || 'deepseek-flash');
console.log('HF_DEEPSEEK_MODEL:', process.env.HF_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3.2');

const listResponse = await fetch('https://api.deepseek.com/models', {
  headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
});
const listBody = await listResponse.text();
let listData = {};
try { listData = listBody ? JSON.parse(listBody) : {}; } catch { listData = {}; }
console.log('\nDEEPSEEK /models STATUS:', listResponse.status);
console.log('DEEPSEEK /models BODY:', listBody.slice(0, 2000));

for (const model of [process.env.DEEPSEEK_MODEL || 'deepseek-flash', process.env.HF_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3.2']) {
  console.log(`\n--- probing model: ${model} ---`);
  try {
    const result = await withTimeout(probeDeepSeek(model, messages), model);
    console.log('STATUS: PASS');
    console.log('ANSWER:', JSON.stringify(result.text));
    console.log('REASONING_LEN:', result.reasoningText.length);
    console.log('MODEL_USED_IN_RESPONSE:', result.raw?.model || '(not echoed)');
  } catch (error) {
    console.log('STATUS: FAIL');
    console.log('ERROR:', error?.status || 'timeout', error?.message || String(error));
  }
}
process.exit(0);
