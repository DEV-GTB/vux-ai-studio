import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import compression from 'compression';
import client from 'prom-client';
import chatRouter from './routes/chat.js';
import codeRouter from './routes/code.js';
import visionRouter from './routes/vision.js';
import liveVisionRouter from './routes/liveVision.js';
import imageRouter from './routes/image.js';
import object3dRouter from './routes/3d.js';
import musicRouter from './routes/music.js';
import ttsRouter from './routes/tts.js';
import sttRouter from './routes/stt.js';
import memoryRouter from './routes/memory.js';
import newsRouter from './routes/news.js';
import searchRouter from './routes/search.js';
import weatherRouter from './routes/weather.js';
import terminalRouter from './routes/terminal.js';
import projectRouter from './routes/project.js';
import workspaceRouter from './routes/workspace.js';
import iotRouter from './routes/iot.js';
import esp32Router from './routes/esp32.js';
import deviceRouter from './routes/device.js';
import trainingRouter from './routes/training.js';
import knowledgeRouter from './routes/knowledge.js';
import feedbackRouter from './routes/feedback.js';
import { seedDefaultKnowledge } from './lib/knowledgeStore.js';
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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://cdn.jsdelivr.net'],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
      },
    },
  })
);

// The frontend is served by this same server, so no cross-origin requests
// are needed. Only enable CORS if you explicitly host the UI elsewhere.
if (process.env.ALLOWED_ORIGIN) {
  const allowedOrigins = process.env.ALLOWED_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
}

// Compress responses (JSON, static assets) to reduce bandwidth and latency.
app.use(compression());

// Bound request lifetime so a hung provider or slow client cannot pin a connection.
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 120000;
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timed out.' });
    }
  });
  next();
});

app.use(express.json({ limit: '20mb' }));

// Rate limit every /api/* route per IP. Free-tier Gemini quotas are small
// and shared across all your users — this is what stops one visitor (or
// one bot) from burning through the day's quota.
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 40, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.originalUrl.split('?')[0];
    const freeLivePath = path === '/api/v1/iot/esp32/status' ||
      path === '/api/device/state' ||
      path.startsWith('/api/device/') ||
      path === '/api/news' ||
      path === '/api/weather';
    return freeLivePath;
  },
  message: { error: 'VUX AI is getting a lot of requests from you — please slow down.' },
});
app.use('/api/', apiLimiter);
app.use('/api/device', rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Device request limit reached. Please wait a moment.' },
}));
app.use('/api/device/state', rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Device dashboard refresh limit reached. Please wait a moment.' },
}));

// Prometheus metrics: default process metrics plus per-route request counters.
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
});

app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
      huggingface: Boolean(process.env.HF_TOKEN && process.env.HF_TOKEN !== 'your_huggingface_api_key_here'),
      groq: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here'),
      cloudflare: Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_API_TOKEN !== 'your_cloudflare_api_token_here' && process.env.CLOUDFLARE_ACCOUNT_ID),
    },
  });
});

app.get('/api/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error?.message || 'metrics error');
  }
});

app.get('/api/config', (req, res) => {
  res.json({ requiresAccessCode: false });
});

if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
  const hostedExecutionDisabled = (_req, res) => res.status(403).json({
    error: 'HOSTED_EXECUTION_DISABLED',
    message: 'Terminal execution and project mutation are disabled on public hosting.',
  });
  app.use('/api/terminal', hostedExecutionDisabled);
  app.use('/api/project/run', hostedExecutionDisabled);
  app.use('/api/project/fix', hostedExecutionDisabled);
  app.use('/api/workspace', hostedExecutionDisabled);
}

app.use('/api/chat', chatRouter);
app.use('/api/code', codeRouter);
app.use('/api/vision', visionRouter);
app.use('/api/vision/app', liveVisionRouter);
app.use('/api/image', imageRouter);
app.use('/api/3d', object3dRouter);
app.use('/api/music', musicRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/stt', sttRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/news', newsRouter);
app.use('/api/search', searchRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/training', trainingRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/terminal', terminalRouter);
app.use('/api/project', projectRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/device', deviceRouter);
app.use('/api/v1/iot/esp32', esp32Router);
app.use('/api/v1/iot', iotRouter);

try { seedDefaultKnowledge(); } catch (error) { console.warn('[knowledge] seed failed:', error?.message || error); }

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

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  const hasAnyAiKey = Boolean(process.env.GEMINI_API_KEY);
  const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  app.listen(PORT, HOST, () => {
    console.log(`VUX AI is running at http://localhost:${PORT}`);
    if (!hasAnyAiKey) console.warn('  Warning: no AI key is set — chat will fail.');
  });
}

export default app;