import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import chatRouter from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Hides X-Powered-By, sets HSTS/frame/content-type headers, and locks down
// what the page is allowed to load or connect to. connectSrc is 'self'
// only — the browser never talks to Gemini/Hugging Face directly, so even
// a compromised script in the page can't be used to exfiltrate to them or
// reveal which providers are in use.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
        mediaSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
      },
    },
  })
);

// The frontend is served by this same server, so no cross-origin requests
// are needed. Only enable CORS if you explicitly host the UI elsewhere.
if (process.env.ALLOWED_ORIGIN) {
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
}

app.use(express.json({ limit: '1mb' }));

// Rate limit every /api/* route per IP. Free-tier provider quotas are small
// and shared across all your users — this is what stops one visitor (or
// one bot) from burning through the day's Gemini/Hugging Face quota.
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 40, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Vux AI Studio is getting a lot of requests from you — please slow down.' },
});
app.use('/api/', apiLimiter);

// Optional shared access code, recommended once this is public. Disabled
// until APP_ACCESS_CODE is set in the environment.
function requireAccessCode(req, res, next) {
  const configured = process.env.APP_ACCESS_CODE;
  if (!configured) return next();

  const provided = req.get('x-vux-access-code') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) return res.status(401).json({ error: 'Invalid or missing access code' });
  next();
}

// Safe to expose — tells the frontend whether to show the access-code
// prompt, without revealing the code itself or anything about the
// providers behind it.
app.get('/api/config', (req, res) => {
  res.json({ requiresAccessCode: Boolean(process.env.APP_ACCESS_CODE) });
});

app.use('/api/chat', requireAccessCode, chatRouter);

// Serve the landing page as the first route the visitor sees.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const PORT = process.env.PORT || 3000;
const hasAnyAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY);

app.listen(PORT, () => {
  console.log(`Vux AI Studio is running at http://localhost:${PORT}`);
  if (!hasAnyAiKey) console.warn('  Warning: no AI key is set — chat will fail.');
  if (!process.env.APP_ACCESS_CODE) console.warn('  Warning: APP_ACCESS_CODE is not set — the app is open to anyone with the URL.');
});