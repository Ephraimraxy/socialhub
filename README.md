# SocialHub

A production-oriented SaaS foundation that lets clients connect social accounts, generate AI content, create voice/video assets, and publish or schedule across YouTube, Instagram, Facebook, and TikTok after platform approval.

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
- Platform OAuth connection flow
- AI campaign generator
- Publishing queue
- User registration and login
- Tenant/workspace bootstrap
- Paystack checkout initialization
- Platform admin billing plan management
- Claude campaign generation
- ElevenLabs voice asset generation
- External video render endpoint hook
- OAuth start/callback flow for Google, Meta, and TikTok providers
- Live publishing queue that refuses to mark posts complete without approved platform adapters
- Full workflow map
- Build blueprint and business model view

## What comes next

- PostgreSQL persistence adapter
- Encrypted OAuth token vault
- Full Paystack subscription event reconciliation
- Optional Stripe adapter later for Stripe Atlas or supported-country expansion
- Video rendering worker
- YouTube, Meta, and TikTok app review completion
- Platform upload/publishing adapters after provider approval
