# Vux AI Studio — chat, code, image & video in one app

A web app with one interface for four capabilities: chat, code generation
(same chat, just ask for code), image generation, and video generation.
Nothing here is trained by you — it's your own UI and identity, calling
free-tier hosted models underneath.

## Under the hood — 100% free-tier, $0 cost

| Feature | Model / API | Cost |
|---|---|---|
| Chat & code | Google Gemini API | Free tier, no credit card |
| Image generation | Hugging Face Inference API (FLUX.1-schnell) | Free tier, no credit card |
| Video generation | Hugging Face Inference API (open text-to-video model) | Free tier, no credit card |

**Be honest with yourself about video.** There is currently no free tier
anywhere that matches paid services like Stability, Runway, or Veo. The
free model wired up here produces short (a couple seconds), low-resolution
clips, and Hugging Face's shared free GPUs mean it sometimes needs 20-60
seconds to "wake up" (the app retries automatically a few times). If you
need real quality, that's the one piece worth paying for later — everything
else here holds up well on the free tier.

## 1. Get API keys (both genuinely free, no card required)

- Google Gemini: https://aistudio.google.com/apikey — sign in with any
  Google account, click "Create API key."
- Hugging Face: https://huggingface.co/join — create a free account, then
  generate a "Read" token at https://huggingface.co/settings/tokens

## 2. Set up

```bash
cd forge-ai-studio
cp .env.example .env
# edit .env and paste in your two API keys
npm install
npm start
```

Open http://localhost:3000 — chat, image, and video are all live.

## 3. Costs and limits

This is $0 to run, but "free" means rate-limited, not unlimited:

- **Gemini free tier**: daily request caps that reset every 24h. Fine for
  personal use or a small number of users; will throttle under real traffic.
- **Hugging Face free tier**: shared GPU capacity — expect queueing at
  peak times, and models "cold start" (unload when idle, ~20-60s to spin
  back up on first use after a while).
- No spending risk either way — these tiers cap out or slow down rather
  than billing you, so there's no surprise invoice to worry about.

If you outgrow the free tier (real traffic, faster responses, better video),
each service has an affordable paid tier you can switch to later just by
changing the API key and model name — nothing else in the app needs to change.

## 4. Deploying

This app needs a persistent Node server (not a serverless function),
because video generation polls for up to a minute or so.

- **Render** or **Railway** — connect your repo, set the two env vars in
  their dashboard, done. Both have free tiers too.
- **A VPS** (e.g. DigitalOcean) — clone the repo, `npm install`, run with
  a process manager like `pm2`.

Avoid Vercel/Netlify serverless functions here — they'll time out on video
generation.

**Before deploying it publicly**, add either authentication or a
request-rate limit — otherwise anyone who finds the URL can burn through
your free-tier quota for the day. A simple option: gate the app behind a
shared password check in `server.js`, or add per-IP rate limiting with a
package like `express-rate-limit`.

## 5. Customizing the identity

- Rename "Forge" in `public/index.html` and `.brand` in `style.css`.
- Colors/fonts live at the top of `public/style.css` as CSS variables —
  change `--accent`, `--bg`, or the font imports to reskin it.
- Swap in a different chat model by editing `GEMINI_MODEL` in `.env`
  (e.g. `gemini-3.1-pro` for higher quality, slower/lower free quota).
  Google rotates which model IDs are free fairly often — if you get a
  "model no longer available" error, check the current list at
  https://ai.google.dev/gemini-api/docs/models and update the value.
- Swap the image or video model by editing `HF_IMAGE_MODEL` /
  `HF_VIDEO_MODEL` in `.env` — any Hugging Face model that supports the
  Inference API for that task will work.

## What's not included (possible next steps)

- User accounts / multi-user support (right now session history is
  per-browser via localStorage, not shared across devices).
- Streaming chat responses (currently waits for the full reply).
- A queue for video jobs instead of holding the HTTP request open.
- Automatic fallback to a paid tier if the free tier gets rate-limited.

Ask if you want any of these built next.