import '../tests/helpers/memoryDb.js';
import { createServer } from 'node:http';
import express from 'express';

process.env.HF_TOKEN = process.env.HF_TOKEN;
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL;
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL;

const { default: chatRouter } = await import('../routes/chat.js');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/chat', chatRouter);
const server = createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const res = await fetch(`${baseUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'What is a closure in JavaScript?' }] }),
});
const text = await res.text();
let body = {};
try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
let provider = '(none)';
let model = '(none)';
res.headers.forEach((value, key) => {
  if (key.toLowerCase() === 'x-vux-ai-provider') provider = value;
  if (key.toLowerCase() === 'x-vux-ai-model') model = value;
});
console.log('LIVE CHAT STATUS:', res.status);
console.log('LIVE CHAT PROVIDER:', provider);
console.log('LIVE CHAT MODEL:', model);
console.log('LIVE CHAT TEXT:', String(body.text || '').slice(0, 100));

server.close();
process.exit(0);
