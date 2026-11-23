// VUX LIVE SEARCH route — unified Internet Intelligence endpoint.
//
//   GET    /api/search?q=...          unified auto-routed search
//   POST   /api/search/web            searchWeb(query)
//   POST   /api/search/news           searchNews(query)
//   POST   /api/search/read           readWebsite(url)
//   POST   /api/search/analyze        analyzeWebsite(url)
//
// Free-first: SearXNG (self-hosted), GDELT, Jina Reader, Wikipedia. Configured
// keys (NewsAPI, NewsData, Tavily, Pixabay, Jina) are optional fallbacks and
// live only on the backend (.env, gitignored). The general /api rate limiter
// is skipped here on purpose — search is a free live source.

import { Router } from 'express';
import { liveSearch } from '../lib/liveSearch.js';
import { validateBody, validateQuery } from '../lib/requestValidation.js';
import { z } from 'zod';

const router = Router();

const searchQuerySchema = z.object({ q: z.string().min(1) }).passthrough();
const webBodySchema = z.object({ query: z.string().min(1) }).passthrough();
const newsBodySchema = z.object({ query: z.string().min(1) }).passthrough();
const readBodySchema = z.object({ url: z.string().min(1) }).passthrough();
const analyzeBodySchema = z.object({ url: z.string().min(1) }).passthrough();

// Unified: auto-routes news/web/website by inspecting the query.
router.get('/', validateQuery(searchQuerySchema), async (req, res) => {
  try {
    const result = await liveSearch.unifiedSearch(req.query.q);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ kind: 'error', query: req.query.q, status: 'error', error: String(error?.message || error) });
  }
});

router.post('/web', validateBody(webBodySchema), async (req, res) => {
  try {
    const result = await liveSearch.searchWeb(req.body.query);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ kind: 'web', query: req.body.query, status: 'error', error: String(error?.message || error) });
  }
});

router.post('/news', validateBody(newsBodySchema), async (req, res) => {
  try {
    const result = await liveSearch.searchNews(req.body.query);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ kind: 'news', query: req.body.query, status: 'error', error: String(error?.message || error) });
  }
});

router.post('/read', validateBody(readBodySchema), async (req, res) => {
  try {
    const result = await liveSearch.readWebsite(req.body.url);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ kind: 'read', url: req.body.url, status: 'error', error: String(error?.message || error) });
  }
});

router.post('/analyze', validateBody(analyzeBodySchema), async (req, res) => {
  try {
    const result = await liveSearch.analyzeWebsite(req.body.url);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ kind: 'analyze', url: req.body.url, status: 'error', error: String(error?.message || error) });
  }
});

export default router;
