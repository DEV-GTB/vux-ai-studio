import './tests/helpers/memoryDb.js';
import { createServer } from 'node:http';
import express from 'express';

process.env.HF_TOKEN = 'test-huggingface-token';
process.env.GROQ_API_KEY = '';
process.env.GEMINI_API_KEY = '';
process.env.CLOUDFLARE_API_TOKEN = '';
process.env.CLOUDFLARE_ACCOUNT_ID = '';

const { default: chatRouter } = await import('./routes/chat.js');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/chat', chatRouter);
const server = createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
let submitted = null;
globalThis.fetch = async (url, options) => {
  if (String(url).includes('router.huggingface.co')) {
    submitted = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Here are todays Kerala news headlines.' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('geocoding-api.open-meteo.com')) {
    return new Response(JSON.stringify({ results: [{ name: 'Kochi', country: 'India', latitude: 9.97, longitude: 76.29 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('open-meteo.com')) {
    return new Response(JSON.stringify({ current: { temperature_2m: 31, apparent_temperature: 34, relative_humidity_2m: 70, weather_code: 3, wind_speed_10m: 4 }, daily: { time: ['2026-11-01'], temperature_2m_max: [33], temperature_2m_min: [27], weather_code: [3] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('gdelt.info') || String(url).includes('newsapi.org')) {
    return new Response(JSON.stringify({ articles: [{ title: 'Kerala news test headline', url: 'https://example.com/kerala', source: { name: 'Test Wire' }, description: 'Test description' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: 'unused' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const res = await nativeFetch(`${baseUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: "What's the news today for Kerala?" }] }),
});
console.log('DBG STATUS', res.status);
const body = await res.json();
console.log('DBG BODY', JSON.stringify(body).slice(0, 300));
console.log('DBG SUBMITTED SYSTEM HAS WEB SEARCH:', Boolean(submitted && String(submitted.messages[0]?.content || '').includes('WEB SEARCH RESULTS')));
console.log('DBG SUBMITTED SYSTEM HAS LIVE WEATHER:', Boolean(submitted && String(submitted.messages[0]?.content || '').includes('LIVE WEATHER CONTEXT')));
console.log('DBG SUBMITTED SYSTEM HAS STUDIO GUIDE:', Boolean(submitted && String(submitted.messages[0]?.content || '').includes('VUX AI Studio tools')));
server.close();
process.exit(0);
