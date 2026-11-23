// VUX AI NEWS DIGEST — AI-powered news digestion with professional paragraphs.
//
// Fetches real-time news from configured providers, then uses Gemini to write
// clear, professional paragraphs that explain each story with AI context.
// Each news item is stored one-by-one (append-only JSONL) so nothing is lost.
//
// No prepaid credits required for the digestion layer — Gemini free tier is
// used for the writing, and news comes from NewsAPI/NewsData/GDELT.

import { writeFile, appendFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { searchNews } from './liveSearch.js';
import { callGeminiText, getGeminiModel, hasGeminiKey } from './gemini-flash.js';

const NEWS_DIGEST_DIR = join(process.cwd(), 'data', 'news-digest');
const NEWS_DIGEST_FILE = join(NEWS_DIGEST_DIR, 'digest.jsonl');

const DIGEST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const digestCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function ensureDigestDir() {
  try { await mkdir(NEWS_DIGEST_DIR, { recursive: true }); } catch { /* exists */ }
}

async function loadStoredDigests() {
  try {
    await ensureDigestDir();
    const content = await readFile(NEWS_DIGEST_FILE, 'utf8');
    const lines = String(content).split('\n').filter(Boolean);
    return lines.map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

async function storeDigestItem(item) {
  await ensureDigestDir();
  const line = JSON.stringify({ ...item, storedAt: nowIso() });
  await appendFile(NEWS_DIGEST_FILE, line + '\n');
}

// Build a professional, AI-explained paragraph for one news item using Gemini.
async function digestNewsItem(article, query) {
  if (!hasGeminiKey()) {
    return {
      ...article,
      aiDigest: null,
      aiDigestError: 'No Gemini key configured for AI digestion.',
    };
  }

  const systemPrompt = `You are VUX AI, a professional news analyst and editor.
Your job is to take a raw news headline and description and write a single,
polished, easy-to-understand paragraph that explains what happened, why it
matters, and what it means for the reader.

Rules:
- Write exactly one paragraph (3-6 sentences).
- Professional, neutral, clear tone — like a briefing for a busy professional.
- Start with the core fact (who, what, when), then explain the significance.
- Do not invent facts not present in the source text.
- If the source is thin, say so plainly rather than guessing.
- Do not use bullet points or markdown formatting inside the paragraph.
- End with one sentence on what to watch next or why the reader should care.
- The reader is asking about: "${query}"`;

  const userContent = `Headline: ${article.title}\nSource: ${article.publisher || article.source}\nDescription: ${article.description || '(no description provided)'}\nDate: ${article.date || '(not available)'}\nURL: ${article.url}`;

  try {
    const model = getGeminiModel();
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
    const paragraph = await callGeminiText(messages, { model });
    return {
      ...article,
      aiDigest: paragraph.trim(),
      aiDigestModel: model,
      aiDigestError: null,
    };
  } catch (error) {
    return {
      ...article,
      aiDigest: null,
      aiDigestError: String(error?.message || error),
    };
  }
}

// Fetch news for a query, write an AI paragraph for each item, store each one,
// and return the digested list.
export async function digestNews(query, options = {}) {
  if (!query || !String(query).trim()) {
    return { items: [], provider: 'none', status: 'error', error: 'A query is required.' };
  }

  const q = String(query).trim();
  const cacheKey = `digest:${q.toLowerCase()}`;
  const cached = digestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // 1. Fetch real news.
  const news = await searchNews(q, options);
  if (news.status !== 'ok' || !news.results.length) {
    return {
      items: [],
      provider: news.provider,
      status: news.status,
      error: news.error || 'No news found for this query.',
      count: 0,
      retrievedAt: nowIso(),
    };
  }

  // 2. Write an AI paragraph for each item (one by one, no errors stop the rest).
  const items = [];
  for (const article of news.results) {
    const digested = await digestNewsItem(article, q);
    items.push(digested);
    // Store each item individually so none are lost even if later ones fail.
    try { await storeDigestItem(digested); } catch { /* storage is best-effort */ }
  }

  const data = {
    query: q,
    items,
    provider: news.provider,
    status: 'ok',
    error: null,
    count: items.length,
    digestedCount: items.filter((i) => i.aiDigest).length,
    retrievedAt: nowIso(),
  };
  digestCache.set(cacheKey, { data, expiresAt: Date.now() + DIGEST_CACHE_TTL_MS });
  return data;
}

// Get all previously stored digests (for "AI learned the daily news" history).
export async function getStoredDigests(options = {}) {
  const limit = Number(options.limit || 50);
  const stored = await loadStoredDigests();
  // Newest first.
  stored.sort((a, b) => (b.storedAt || '') > (a.storedAt || '') ? 1 : -1);
  return {
    items: stored.slice(0, limit),
    count: stored.length,
    retrievedAt: nowIso(),
  };
}

export const newsDigest = {
  digestNews,
  getStoredDigests,
};

export default newsDigest;
