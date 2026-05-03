# Social AI Studio

A React MVP prototype for a SaaS that lets clients connect social accounts, generate AI content, create voice/video assets, and publish or schedule across YouTube, Instagram, Facebook, and TikTok.

## Run locally

```powershell
& 'C:\Program Files\nodejs\npm.cmd' ci
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

## Deploy

This app is prepared for GitHub-to-Railway CI/CD:

- GitHub Actions builds every push and pull request to `main`.
- Railway uses `railway.json`.
- Production start command is `npm run start`.
- Health check is `/health`.

## What is implemented

- Client command center
- Platform connection prototype
- AI campaign generator prototype
- Publishing queue prototype
- Full workflow map
- Build blueprint and business model view

## What comes next

- Backend API scaffold
- Database schema
- Paystack subscriptions for the first Nigeria-ready billing path
- Optional Stripe adapter later for Stripe Atlas or supported-country expansion
- OAuth token vault
- Claude API integration
- ElevenLabs voice generation
- Video rendering worker
- Platform publishing APIs
