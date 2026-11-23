// VUX LIVE SEARCH — unified, free-first Internet Intelligence.
//
// One built-in tool, one interface, multiple free data providers.
//
//   searchWeb(query)      -> SearXNG (self-hosted, no key) -> Wikipedia fallback
//   searchNews(query)     -> GDELT (no key) -> NewsAPI -> NewsData -> Wikipedia
//   readWebsite(url)      -> Jina Reader (no key, 20/min) -> direct HTML fetch
//   analyzeWebsite(url)   -> cheerio metadata + Jina Reader content
//
// Every provider is optional: if none is configured/reachable the tool reports
// a clear availability status instead of pretending success. Results carry
// source links, publisher, date, retrieval timestamp and provider name so the
// AI can cite them and the reader can verify them.
//
// No provider is a hard dependency. No prepaid credits. No compulsory paid
// subscription. API keys live only on the backend (in .env, gitignored).

import { LruCache } from './lruCache.js';
import { load } from 'cheerio';

const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const READ_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 15000;
const MAX_RESULTS = 8;

const cache = new LruCache(500);
const readCache = new LruCache(200);

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:8080';
const GDELT_BASE = 'https://api.gdelt.info/api/v2/doc';
const NEWSAPI_URL = 'https://newsapi.org/v2/everything';
const NEWSDATA_URL = 'https://newsdata.io/api/1/news';
const JINA_BASE = 'https://r.jina.ai';

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// SSRF protection: only public, non-loopback http(s) URLs may be fetched.
// ---------------------------------------------------------------------------
const PRIVATE_IP_RE = /^(?:127\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.|169\.254\.)/;
const LOCALHOST_RE = /^(?:localhost|localhost\.localdomain)$/i;

function hostnameOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

async function resolveHosts(host) {
  const { lookup } = await import('node:dns/promises');
  try {
    const res = await lookup(host, { all: true });
    return Array.isArray(res) ? res.map((r) => r.address) : [res.address];
  } catch {
    return [];
  }
}

export function isAllowedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  const proto = parsed.protocol;
  if (proto !== 'http:' && proto !== 'https:') return false;
  const host = parsed.hostname;
  if (!host || LOCALHOST_RE.test(host)) return false;
  if (PRIVATE_IP_RE.test(host)) return false;
  return true;
}

export async function isSafePublicUrl(url) {
  if (!isAllowedUrl(url)) return false;
  const host = hostnameOf(url);
  const ips = await resolveHosts(host);
  if (ips.length === 0) return false;
  return ips.some((ip) => !PRIVATE_IP_RE.test(ip) && !LOCALHOST_RE.test(ip));
}

async function fetchJsonWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { ok: response.ok, status: response.status, data, text };
  } catch (error) {
    return { ok: false, status: 0, data: null, text: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function cacheKey(prefix, value) {
  return `${prefix}:${String(value || '').toLowerCase().trim()}`;
}

function toResult({ title, description, url, source = '', publisher = '', date = '', provider, status = 'ok', image = '' }) {
  return {
    title: String(title || 'Untitled').trim() || 'Untitled',
    description: String(description || '').trim(),
    url: String(url || '').trim(),
    source: String(source || '').trim(),
    publisher: String(publisher || source || '').trim(),
    date: String(date || '').trim(),
    image: String(image || '').trim(),
    retrievalTimestamp: nowIso(),
    provider,
    status,
  };
}

function dedupe(results) {
  const seen = new Set();
  const out = [];
  for (const r of results) {
    const key = (r.url || r.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ===========================================================================
// 1. searchWeb(query) — general internet search
//    SearXNG (self-hosted, no key) -> Wikipedia fallback
// ===========================================================================
async function searchSearXng(query, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const url = `${SEARXNG_URL}/search?q=${encodeURIComponent(String(query).trim())}&format=json&language=en`;
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok || !result.data || !Array.isArray(result.data.results)) {
    return { results: [], provider: 'SearXNG', status: result.ok ? 'unavailable' : 'error', error: result.text };
  }
  const results = result.data.results.slice(0, MAX_RESULTS).map((item) => toResult({
    title: item.title,
    description: item.content || item.snippet || '',
    url: item.url,
    source: item.engine || 'SearXNG',
    publisher: item.engine || 'SearXNG',
    date: item.publishedDate || '',
    image: item.img_src || '',
    provider: 'SearXNG',
  }));
  return { results, provider: 'SearXNG', status: 'ok' };
}

async function searchWikipedia(query, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(String(query).trim())}&limit=6&namespace=0&format=json`;
  const result = await fetchJsonWithTimeout(searchUrl);
  if (!result.ok || !result.data || !Array.isArray(result.data[1])) {
    return { results: [], provider: 'Wikipedia', status: 'unavailable', error: result.text };
  }
  const titles = result.data[1];
  const results = [];
  for (const title of titles.slice(0, MAX_RESULTS)) {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;
    const summaryResult = await fetchJsonWithTimeout(summaryUrl);
    const summary = summaryResult.ok && summaryResult.data ? summaryResult.data : {};
    results.push(toResult({
      title,
      description: String(summary.extract || '').trim(),
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`,
      source: 'Wikipedia',
      publisher: 'Wikipedia',
      date: '',
      provider: 'Wikipedia',
    }));
  }
  return { results, provider: 'Wikipedia', status: 'ok' };
}

export async function searchWeb(query, opts = {}) {
  if (!query || !String(query).trim()) return { results: [], provider: 'none', status: 'error', error: 'A query is required.' };
  const key = cacheKey('web', String(query));
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let attempt = await searchSearXng(query, opts);
  if (attempt.status !== 'ok' || !attempt.results.length) {
    attempt = await searchWikipedia(query, opts);
  }
  const results = dedupe(attempt.results || []);
  const data = {
    query: String(query).trim(),
    results,
    provider: attempt.provider,
    status: attempt.status || (results.length ? 'ok' : 'unavailable'),
    error: attempt.error || null,
    count: results.length,
    retrievedAt: nowIso(),
  };
  cache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return data;
}

// ===========================================================================
// 2. searchNews(query) — news retrieval
//    GDELT (no key) -> NewsAPI -> NewsData -> Wikipedia fallback
// ===========================================================================
async function searchGdelt(query, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const queryValue = `"${String(query).trim()}"`;
  const url = `${GDELT_BASE}?query=${encodeURIComponent(queryValue)}&maxrecords=${MAX_RESULTS}&mode=artlist&format=json`;
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok || !result.data || !Array.isArray(result.data.articles)) {
    return { results: [], provider: 'GDELT', status: result.ok ? 'unavailable' : 'error', error: result.text };
  }
  const results = result.data.articles.slice(0, MAX_RESULTS).map((a) => toResult({
    title: a.title,
    description: a.description || a.summary || '',
    url: a.url,
    source: a.source?.name || a.source || 'GDELT',
    publisher: a.source?.name || a.source || 'GDELT',
    date: a.pubdate || a.published || a.date || '',
    image: a.image || a.image_url || '',
    provider: 'GDELT',
  }));
  return { results, provider: 'GDELT', status: 'ok' };
}

async function searchNewsApi(query, opts = {}) {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return { results: [], provider: 'NewsAPI', status: 'unconfigured', error: 'No NEWSAPI_KEY configured.' };
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const url = `${NEWSAPI_URL}?q=${encodeURIComponent(String(query).trim())}&apiKey=${apiKey}&pageSize=${MAX_RESULTS}&language=en`;
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok || !result.data || !Array.isArray(result.data.articles)) {
    return { results: [], provider: 'NewsAPI', status: result.ok ? 'unavailable' : 'error', error: result.data?.message || result.text };
  }
  const results = result.data.articles.slice(0, MAX_RESULTS).map((a) => toResult({
    title: a.title,
    description: a.description || a.content || '',
    url: a.url,
    source: a.source?.name || 'NewsAPI',
    publisher: a.source?.name || 'NewsAPI',
    date: a.publishedAt || '',
    image: a.urlToImage || '',
    provider: 'NewsAPI',
  }));
  return { results, provider: 'NewsAPI', status: 'ok' };
}

async function searchNewsData(query, opts = {}) {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return { results: [], provider: 'NewsData', status: 'unconfigured', error: 'No NEWSDATA_API_KEY configured.' };
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const url = `${NEWSDATA_URL}?apikey=${apiKey}&q=${encodeURIComponent(String(query).trim())}&language=en`;
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok || !result.data || !Array.isArray(result.data.results)) {
    return { results: [], provider: 'NewsData', status: result.ok ? 'unavailable' : 'error', error: result.data?.message || result.text };
  }
  const results = result.data.results.slice(0, MAX_RESULTS).map((a) => toResult({
    title: a.title,
    description: a.description || a.content || '',
    url: a.link || a.url || '',
    source: a.source_name || a.source || 'NewsData',
    publisher: a.source_name || a.source || 'NewsData',
    date: a.pubDate || a.published_date || a.date || '',
    image: a.image_url || a.image || '',
    provider: 'NewsData',
  }));
  return { results, provider: 'NewsData', status: 'ok' };
}

export async function searchNews(query, opts = {}) {
  if (!query || !String(query).trim()) return { results: [], provider: 'none', status: 'error', error: 'A query is required.' };
  const key = cacheKey('news', String(query));
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const attempts = [
    () => searchGdelt(query, opts),
    () => searchNewsApi(query, opts),
    () => searchNewsData(query, opts),
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.status === 'ok' && result.results.length) {
        const data = {
          query: String(query).trim(),
          results: dedupe(result.results),
          provider: result.provider,
          status: 'ok',
          error: null,
          count: result.results.length,
          retrievedAt: nowIso(),
        };
        cache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        return data;
      }
      lastError = result.error || `${result.provider} returned no results`;
    } catch (error) {
      lastError = String(error?.message || error);
    }
  }
  // Final fallback: Wikipedia summaries for the topic.
  const wiki = await searchWikipedia(query, opts);
  const data = {
    query: String(query).trim(),
    results: dedupe(wiki.results || []),
    provider: wiki.results.length ? 'Wikipedia' : 'none',
    status: wiki.results.length ? 'ok' : 'unavailable',
    error: lastError || null,
    count: wiki.results.length,
    retrievedAt: nowIso(),
  };
  cache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return data;
}

// ===========================================================================
// 3. readWebsite(url) — website content reader
//    Jina Reader (no key, 20/min; key raises to 500/min) -> direct HTML fetch
// ===========================================================================
function jinaUrl(targetUrl) {
  return `${JINA_BASE}/${encodeURIComponent(targetUrl.trim())}`;
}

async function readWithJina(targetUrl, opts = {}) {
  const apiKey = process.env.JINA_API_KEY;
  const headers = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const result = await fetchJsonWithTimeout(jinaUrl(targetUrl), { headers });
  if (!result.ok || typeof result.data !== 'string' && !result.data) {
    return { content: '', provider: 'Jina Reader', status: result.ok ? 'unavailable' : 'error', error: result.text };
  }
  const markdown = typeof result.data === 'string' ? result.data : String(result.data);
  return { content: markdown, provider: 'Jina Reader', status: 'ok' };
}

async function readDirectHtml(targetUrl, opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const result = await fetchJsonWithTimeout(targetUrl);
  if (!result.ok || !result.text) {
    return { content: '', provider: 'Direct HTML', status: result.ok ? 'unavailable' : 'error', error: result.text };
  }
  // Strip tags crudely to get readable text; analyzeWebsite does full parsing.
  const text = result.text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { content: text, provider: 'Direct HTML', status: 'ok' };
}

export async function readWebsite(url, opts = {}) {
  if (!url || typeof url !== 'string') return { content: '', provider: 'none', status: 'error', error: 'A URL is required.' };
  if (!(await isSafePublicUrl(url))) {
    return { content: '', provider: 'none', status: 'blocked', error: 'URL is not a public http(s) address (SSRF guard).' };
  }
  const key = cacheKey('read', url);
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let attempt = await readWithJina(url, opts);
  if (attempt.status !== 'ok' || !attempt.content.trim()) {
    attempt = await readDirectHtml(url, opts);
  }
  const data = {
    url,
    content: attempt.content || '',
    provider: attempt.provider,
    status: attempt.status || (attempt.content ? 'ok' : 'unavailable'),
    error: attempt.error || null,
    retrievedAt: nowIso(),
  };
  readCache.set(key, { data, expiresAt: Date.now() + READ_CACHE_TTL_MS });
  return data;
}

// ===========================================================================
// 4. analyzeWebsite(url) — custom metadata analyzer (cheerio) + Jina content
// ===========================================================================
function domainOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function extractMeta($, name) {
  const el = $(`meta[name="${name}"], meta[property="${name}"]`).first();
  return el.attr('content') || '';
}

export async function analyzeWebsite(url, opts = {}) {
  if (!url || typeof url !== 'string') return { provider: 'none', status: 'error', error: 'A URL is required.' };
  if (!(await isSafePublicUrl(url))) {
    return { provider: 'none', status: 'blocked', error: 'URL is not a public http(s) address (SSRF guard).' };
  }
  const key = cacheKey('analyze', url);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Read readable content via Jina (primary) / direct HTML (fallback).
  const read = await readWebsite(url, opts);
  const content = read.content || '';

  // Fetch raw HTML for structural metadata.
  let html = '';
  let htmlStatus = 'skipped';
  try {
    const fetchResult = await fetchJsonWithTimeout(url);
    if (fetchResult.ok && fetchResult.text) {
      html = fetchResult.text;
      htmlStatus = 'ok';
    } else {
      htmlStatus = fetchResult.ok ? 'unavailable' : 'error';
    }
  } catch (error) {
    htmlStatus = 'error';
  }

  const $ = load(html || '');
  const title = $('title').first().text().trim() || extractMeta($, 'og:title') || '';
  const description = extractMeta($, 'description') || extractMeta($, 'og:description') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || url;
  const favicon = $('link[rel*="icon"]').first().attr('href') || '';
  const language = $('html').attr('lang') || '';
  const author = extractMeta($, 'author') || extractMeta($, 'article:author') || '';
  const published = extractMeta($, 'article:published_time') || extractMeta($, 'date') || '';
  const ogImage = extractMeta($, 'og:image') || '';
  const headings = $('h1, h2, h3').slice(0, 12).map((_, el) => $(el).text().trim()).get();
  const internalLinks = [];
  const externalLinks = [];
  const domain = domainOf(url);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs;
    try { abs = new URL(href, url).href; } catch { return; }
    const entry = { text: $(el).text().trim(), url: abs };
    try { if (new URL(abs).hostname === domain) internalLinks.push(entry); else externalLinks.push(entry); } catch { externalLinks.push(entry); }
  });
  const images = $('img[src]').slice(0, 20).map((_, el) => ({
    url: new URL($(el).attr('src'), url).href,
    alt: $(el).attr('alt') || '',
  })).get();
  const jsonLd = $('script[type="application/ld+json"]').slice(0, 5).map((_, el) => $(el).html()).get();

  const data = {
    url,
    domain: domainOf(url),
    title,
    description,
    canonicalUrl: canonical,
    favicon,
    language,
    author,
    publishedDate: published,
    ogImage,
    headings,
    internalLinks: internalLinks.slice(0, 40),
    externalLinks: externalLinks.slice(0, 40),
    images,
    structuredData: jsonLd,
    content, // readable body from Jina/direct fetch
    providers: [{ name: read.provider, status: read.status }],
    htmlStatus,
    status: (content || title || description) ? 'ok' : (htmlStatus === 'ok' ? 'ok' : 'unavailable'),
    error: read.error || null,
    retrievedAt: nowIso(),
  };
  cache.set(key, { data, expiresAt: Date.now() + READ_CACHE_TTL_MS });
  return data;
}

// ===========================================================================
// 5. unifiedSearch(query) — auto-route to the right tool
// ===========================================================================
const URL_RE = /^https?:\/\//i;
const NEWS_SIGNALS = [
  'news', 'latest news', 'breaking news', 'news about', 'today\'s news', 'headlines',
  'current events', 'what happened', 'any new', 'newest', 'recent news',
  'state news', 'national news', 'international news', 'local news',
];

function looksLikeNews(text) {
  const v = String(text || '').toLowerCase();
  return NEWS_SIGNALS.some((s) => v.includes(s));
}

function looksLikeUrl(text) {
  return URL_RE.test(String(text || '').trim());
}

export async function unifiedSearch(input, opts = {}) {
  const q = String(input || '').trim();
  if (!q) return { results: [], provider: 'none', status: 'error', error: 'A query or URL is required.' };

  // A bare URL means read/analyze that website.
  if (looksLikeUrl(q)) {
    const analysis = await analyzeWebsite(q, opts);
    return {
      kind: 'website',
      query: q,
      ...analysis,
    };
  }

  if (looksLikeNews(q)) {
    const news = await searchNews(q, opts);
    return {
      kind: 'news',
      query: q,
      results: news.results,
      provider: news.provider,
      status: news.status,
      error: news.error,
      count: news.count,
      retrievedAt: nowIso(),
    };
  }

  const web = await searchWeb(q, opts);
  return {
    kind: 'web',
    query: q,
    results: web.results,
    provider: web.provider,
    status: web.status,
    error: web.error,
    count: web.count,
    retrievedAt: nowIso(),
  };
}

export const liveSearch = {
  searchWeb,
  searchNews,
  readWebsite,
  analyzeWebsite,
  unifiedSearch,
  isAllowedUrl,
  isSafePublicUrl,
  dedupe,
};

export default liveSearch;
