import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import chatRouter from './routes/chat.js';
import imageRouter from './routes/image.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Hides X-Powered-By, sets HSTS/frame/content-type headers, and locks down
// what the page is allowed to load or connect to. connectSrc is 'self'
// only — the browser never talks to Gemini directly, so even a compromised
// script in the page can't be used to exfiltrate to the provider or reveal
// which model is in use.
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

// Rate limit every /api/* route per IP. Free-tier Gemini quotas are small
// and shared across all your users — this is what stops one visitor (or
// one bot) from burning through the day's quota.
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 40, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Vux AI Studio is getting a lot of requests from you — please slow down.' },
});
app.use('/api/', apiLimiter);

app.get('/api/config', (req, res) => {
  res.json({ requiresAccessCode: false });
});

app.use('/api/chat', chatRouter);
app.use('/api/image', imageRouter);

const reactDist = path.join(__dirname, 'forge-ai-studio-react', 'dist');
const legacyPublic = path.join(__dirname, 'public');

// Serve the compiled React app when it exists, with the legacy UI as a local fallback.
app.use(express.static(reactDist, { index: 'index.html' }));
app.use(express.static(legacyPublic, { index: false }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(reactDist, 'index.html'), (error) => {
    if (error) next();
  });
});

const PORT = process.env.PORT || 3000;
const hasAnyAiKey = Boolean(process.env.GEMINI_API_KEY);

app.listen(PORT, () => {
  console.log(`Vux AI Studio is running at http://localhost:${PORT}`);
  if (!hasAnyAiKey) console.warn('  Warning: no AI key is set — chat will fail.');
});