# Vux AI Studio

Vux AI Studio is a privacy-first assistant workspace for chat, ideation, and creative problem solving.

The app is designed to feel like a clean AI studio experience while keeping the identity focused on Vux and using the GTB AI SYSTEM

## What this app includes

- Chat experience with a Vux-branded interface
- Private, username-scoped local history
- English-first responses for non-coding prompts
- Secure server-side handling for AI requests
- Clean, dark-blue modern UI

## Local setup

```bash
cd forge-ai-studio
cp .env.example .env
# add your environment values in .env
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Deployment

This app is designed to run as a persistent Node server, not as a static-only site.

For public deployment, the recommended setup is:

- backend hosted on a Node-capable platform
- frontend served from a static host if needed
- secrets stored only on the server

## Security and privacy

- Keep API keys on the server only
- Do not expose keys or provider details in the browser
- Avoid public sharing of the real environment file

## Branding

This project is developed by Game Theory Building Studio and intentionally branded as Vux AI Studio across the app surface and identity layer.

If you want to adjust the look further, update the UI colors and text in the public interface without exposing any model provider details in the user-facing copy.

## Notes

- Session history is kept locally per username for a simple privacy-friendly flow.
- The app is designed to present itself consistently as Vux AI Studio, not as a vendor-specific tool.
- The system prompt and app identity are kept vendor-neutral by design.

If you want new features later, they can be added without changing the public Vux identity.