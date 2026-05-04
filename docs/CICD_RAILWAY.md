# CI/CD and Railway Deployment

## Target Flow

1. Code is pushed to `Ephraimraxy/socialhub` on GitHub.
2. GitHub Actions runs `npm ci` and `npm run build`.
3. Railway watches the GitHub repository.
4. Every successful push to `main` triggers a Railway deploy.
5. Railway runs `npm ci && npm run build`.
6. Railway starts the app with `npm run start`.

## Railway Setup

Create a new Railway project and choose:

- Deploy from GitHub repo.
- Repository: `Ephraimraxy/socialhub`.
- Branch: `main`.
- Build command: Railway will read `railway.json`.
- Start command: Railway will read `railway.json`.
- Node version: Railway will read `nixpacks.toml` and use Node 20.

## Required Railway Variables

For the production app shell, Railway needs:

```text
NODE_ENV=production
PORT=3000
AUTH_SECRET=
ENABLE_DIRECT_PUBLISHING=false
```

Railway usually injects `PORT` automatically, so you do not normally need to set it manually. Set `AUTH_SECRET` to a long random value before real users create accounts.

For the paid SaaS backend phase, add:

```text
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL=
VIDEO_RENDER_ENDPOINT=
VIDEO_RENDER_API_KEY=
OAUTH_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
DATABASE_URL=
REDIS_URL=
R2_ACCESS_KEY_ID=
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
R2_SECRET_ACCESS_KEY=
```

SocialHub does not include live fallback success paths. If Paystack, Claude, ElevenLabs, rendering, or OAuth variables are missing, the affected route returns a configuration error instead of pretending to complete the action.

Paystack plan codes are managed inside the app by the platform admin under Launch -> Admin Billing. Do not add `PAYSTACK_PLAN_STARTER`, `PAYSTACK_PLAN_GROWTH`, or `PAYSTACK_PLAN_AGENCY` to Railway.

## GitHub Repo Setup

Use the repository named `socialhub` under `Ephraimraxy`, then push this project:

```powershell
git remote add origin https://github.com/Ephraimraxy/socialhub.git
git branch -M main
git push -u origin main
```

After the first push, connect that repo in Railway.
