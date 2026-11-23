// VUX LIVE SEARCH — live verification of all 4 tools.
// Usage: node tools/live-search-check.mjs [--url http://127.0.0.1:3001]
import 'dotenv/config';

const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const base = urlIndex === -1 ? 'http://127.0.0.1:3001' : args[urlIndex + 1];

async function get(path) {
  const response = await fetch(`${base}${path}`, { headers: { 'Accept': 'application/json' } });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

let passed = 0, failed = 0;

function report(name, ok, detail) {
  if (ok) { passed++; console.log(`[PASS] ${name}  ${detail}`); }
  else { failed++; console.log(`[FAIL] ${name}  ${detail}`); }
}

// 1. Unified web search (SearXNG fallback Wikipedia)
try {
  const r = await get('/api/search?q=typescript%20optional%20chaining');
  const ok = r.status === 200 && r.body && Array.isArray(r.body.results) && r.body.kind === 'web';
  report('unified web search', ok, `HTTP ${r.status} kind=${r.body?.kind} results=${r.body?.results?.length} provider=${r.body?.provider}`);
} catch (error) { report('unified web search', false, String(error)); }

// 2. Unified news search (GDELT primary)
try {
  const r = await get('/api/search?q=artificial%20intelligence%20news');
  const ok = r.status === 200 && r.body && Array.isArray(r.body.results) && r.body.kind === 'news';
  report('unified news search', ok, `HTTP ${r.status} kind=${r.body?.kind} results=${r.body?.results?.length} provider=${r.body?.provider}`);
} catch (error) { report('unified news search', false, String(error)); }

// 3. readWebsite (Jina Reader / direct HTML)
try {
  const r = await post('/api/search/read', { url: 'https://example.com' });
  const ok = r.status === 200 && r.body && (r.body.content || r.body.title) && r.body.provider;
  report('readWebsite', ok, `HTTP ${r.status} provider=${r.body?.provider} contentLen=${r.body?.content?.length || 0}`);
} catch (error) { report('readWebsite', false, String(error)); }

// 4. analyzeWebsite (cheerio metadata)
try {
  const r = await post('/api/search/analyze', { url: 'https://example.com' });
  const ok = r.status === 200 && r.body && r.body.title && r.body.domain === 'example.com';
  report('analyzeWebsite', ok, `HTTP ${r.status} title="${r.body?.title}" domain=${r.body?.domain}`);
} catch (error) { report('analyzeWebsite', false, String(error)); }

// 5. SSRF guard blocks private IPs
try {
  const r = await post('/api/search/read', { url: 'http://127.0.0.1:3001/api/health' });
  const ok = r.status === 200 && r.body && r.body.status === 'blocked';
  report('SSRF guard blocks localhost', ok, `HTTP ${r.status} status=${r.body?.status}`);
} catch (error) { report('SSRF guard blocks localhost', false, String(error)); }

// 6. Direct POST endpoints
try {
  const r = await post('/api/search/web', { query: 'node js http module' });
  const ok = r.status === 200 && r.body && r.body.kind === 'web';
  report('POST /api/search/web', ok, `HTTP ${r.status} results=${r.body?.results?.length}`);
} catch (error) { report('POST /api/search/web', false, String(error)); }

try {
  const r = await post('/api/search/news', { query: 'climate change' });
  const ok = r.status === 200 && r.body && r.body.kind === 'news';
  report('POST /api/search/news', ok, `HTTP ${r.status} results=${r.body?.results?.length}`);
} catch (error) { report('POST /api/search/news', false, String(error)); }

console.log(`\nLIVE SEARCH CHECKS: ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
