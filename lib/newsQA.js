// VUX AI NEWS Q&A — AI answers questions from real news sources.
//
// The user asks a question about news, technology, or rules. The system:
//   1. Searches live news for relevant articles (GDELT → NewsAPI → NewsData → Wikipedia)
//   2. Writes a professional, well-structured answer using an AI model
//   3. Includes source links and website names for every claim (reality verification)
//   4. Never fails silently — always returns an answer with sources or a clear status
//
// No SearXNG hosting. Free-first providers only. API keys live on the backend.

import { searchNews } from './liveSearch.js';
import { callGeminiText, getGeminiModel, hasGeminiKey } from './gemini-flash.js';
import { callGroq } from './llama-whisper.js';

const QA_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const qaCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

// Try AI providers in order for writing the professional answer.
// Always returns text or throws — never silent failure.
async function writeAnswerWithAI(messages, question) {
  const errors = [];

  // 1. Gemini (primary, best quality for explanation)
  if (hasGeminiKey()) {
    try {
      const model = getGeminiModel();
      const text = await callGeminiText(messages, { model });
      if (text && text.trim()) return { text, provider: `Gemini (${model})` };
    } catch (error) {
      errors.push(`Gemini: ${String(error?.message || error)}`);
    }
  }

  // 2. Groq (fast, free tier)
  try {
    const text = await callGroq(messages);
    if (text && text.trim()) return { text, provider: 'Groq (qwen/qwen3.8-27b)' };
  } catch (error) {
    errors.push(`Groq: ${String(error?.message || error)}`);
  }

  throw new Error('All AI writing providers are currently unavailable: ' + errors.join('; '));
}

export async function answerNewsQuestion(question, options = {}) {
  if (!question || !String(question).trim()) {
    return { answer: '', sources: [], provider: 'none', status: 'error', error: 'A question is required.' };
  }

  const q = String(question).trim();
  const cacheKey = `qa:${q.toLowerCase()}`;
  const cached = qaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Step 1: Search for relevant news articles.
  const news = await searchNews(q, options);
  let articles = news.results || [];

  // Step 2: Build the AI prompt with source context.
  const sourceContext = articles.map((a, i) => {
    return `[${i + 1}] Title: ${a.title}\nSource: ${a.publisher || a.source}\nDescription: ${a.description || '(no description)'}\nDate: ${a.date || '(not available)'}\nURL: ${a.url}\n`;
  }).join('\n---\n');

  const systemPrompt = `You are VUX AI, a professional news analyst and editor.

Your job is to answer the user's question using ONLY the provided news articles. Write a polished, professional answer:

- Write well-formed paragraphs with correct grammar and clear sentences.
- Start with a direct answer to the question.
- Then explain the context: what happened, who is involved, why it matters.
- Cite sources inline using [1], [2], [3] format matching the numbered source list.
- Include source names (website/publisher) so the reader can verify reality.
- End with a "Sources" section listing each source with its link.
- Be neutral and factual. Do not invent facts not present in the articles.
- If the articles don't fully answer the question, say what is known and what is not.
- The user asked: "${question}"`;

  const userContent = `QUESTION: ${question}\n\nNEWS ARTICLES:\n${sourceContext}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  // Step 3: Write the answer with AI (robust provider chain).
  let result;
  try {
    result = await writeAnswerWithAI(messages, question);
  } catch (error) {
    // Even if AI writing fails, return the raw articles with sources so the user
    // still gets real news with links — never a silent failure.
    return {
      question: q,
      answer: null,
      sources: articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.publisher || a.source || 'Unknown',
        date: a.date || '',
        description: a.description || '',
      })),
      provider: news.provider,
      status: 'partial',
      error: String(error?.message || error),
      retrievedAt: nowIso(),
      note: 'AI writing providers unavailable — returning raw news with source links instead.',
    };
  }

  // Step 4: Build the sources list for the frontend.
  const sources = articles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.publisher || a.source || 'Unknown',
    date: a.date || '',
    description: a.description || '',
    image: a.image || '',
  }));

  const data = {
    question: q,
    answer: result.text,
    sources,
    provider: result.provider,
    newsProvider: news.provider,
    status: 'ok',
    error: null,
    sourceCount: sources.length,
    retrievedAt: nowIso(),
  };

  qaCache.set(cacheKey, { data, expiresAt: Date.now() + QA_CACHE_TTL_MS });
  return data;
}

export const newsQA = {
  answerNewsQuestion,
};

export default newsQA;
