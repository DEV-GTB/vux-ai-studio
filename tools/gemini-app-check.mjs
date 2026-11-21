// Calls the app's own Gemini text path directly to verify it answers.
import 'dotenv/config';
import '../tests/helpers/memoryDb.js';
import { callGeminiText, getGeminiModel, getGeminiApiKey } from '../lib/gemini-flash.js';

console.log('GEMINI_MODEL resolved to:', getGeminiModel());
console.log('GEMINI key present:', Boolean(getGeminiApiKey()));

const messages = [
  { role: 'system', content: 'You are VUX AI. Reply in English only.' },
  { role: 'user', content: 'What is a closure in JavaScript?' },
];

try {
  const text = await callGeminiText(messages);
  console.log('APP GEMINI STATUS: PASS');
  console.log('APP GEMINI ANSWER:', String(text).slice(0, 120));
} catch (error) {
  console.log('APP GEMINI STATUS: FAIL');
  console.log('APP GEMINI ERROR:', error?.status || 'timeout', error?.message || String(error));
}
process.exit(0);
