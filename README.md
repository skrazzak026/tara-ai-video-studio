# Tara AI Studio — text-to-video website starter

A responsive React/Vite text-to-video studio with a **real Kling 2.5 Turbo Pro integration via fal.ai** through Cloudflare Pages Functions. The UI, browser-local gallery, and Pages Functions are included. **No generation occurs until you configure a valid fal.ai API key and your own beta access code.** The provider charges per actual generation.

## Included

- Prompt editor with presets, 5s/10s, 16:9/9:16/1:1 formats
- Server-side `/api/create` endpoint that queues a real fal.ai video generation
- Server-side `/api/status/:id` endpoint to check progress and return the video URL
- Generated video preview and MP4 URL; recent jobs saved in the visitor's own browser
- Private beta gate to prevent anonymous visitors from triggering paid API usage
- React/Vite project ready for GitHub and Cloudflare Pages

## IMPORTANT BEFORE PUBLIC LAUNCH

This is a **private beta MVP**, not a finished public commercial service. The shared beta access code is **not** a substitute for proper per-user authentication, credits, server-side metering, abuse protection, payment processing, quotas, content moderation, persistent job tracking, or permanent video storage. Do not open the paid generation endpoint to the public without those measures. A visitor with the beta access code can submit billable jobs; keep it private, and set provider spending limits if supported. Temporary provider video URLs may expire; add durable storage for a public product.

## Deployment to Cloudflare Pages

1. Upload the contents of this folder to **a new GitHub repository** (do not use your existing book website's repo).
2. On Cloudflare Pages, connect the repo and set:
   - Framework preset: React (Vite)
   - Build command: `npm run build`
   - Output directory: `dist`
   - Production branch: `main`
3. After your first deployment, set these **encrypted** secrets under the Pages project > Settings > Variables and Secrets (Production):
   - `FAL_KEY` — your secret API key from https://fal.ai
   - `APP_ACCESS_CODE` — a strong random password (at least 12 characters, ideally 24+)
4. Redeploy the Pages project so the secrets are available to Functions.
5. Open the public Pages URL. Enter your beta code in the studio field, type a prompt, select 5s/10s, and generate a real video. Budget is paid at https://fal.ai and not included with Cloudflare hosting.

**Never put the API key into React source, a `VITE_` environment variable, or a public GitHub repo.**

## Local development

- Install dependencies: `npm install`
- UI development without live API: `npm run dev`
- Test full Pages Functions locally: copy `.dev.vars.example` to `.dev.vars`, fill in secrets, then `npm run preview:pages`
- API smoke tests (do not require API credits): `npm test`
- Production test build: `npm run build`

## Current provider & cost

- Model: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
- Provider: https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/text-to-video
- As publicly listed in October 2026: **$0.07 per generated second** = $0.35 for 5 sec / $0.70 for 10 sec, before any other applicable costs or provider changes.

## Architecture

Browser React editor -> Cloudflare Pages Function -> fal.ai queue submission -> browser polls Cloudflare Function -> fal.ai queue result -> plays hosted MP4.

## Next steps before commercial launch

User registration and sessions; credit wallet and transactions; payment integration; per-user quotas and concurrency limits; abuse and content moderation; Cloudflare D1 database; R2 for durable video storage; webhook job events; a real dashboard; privacy and terms policies.
