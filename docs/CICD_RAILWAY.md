# CI/CD and Railway Deployment

## Target Flow

1. Code is pushed to `Ephraimraxy/social-ai-studio` on GitHub.
2. GitHub Actions runs `npm ci` and `npm run build`.
3. Railway watches the GitHub repository.
4. Every successful push to `main` triggers a Railway deploy.
5. Railway runs `npm ci && npm run build`.
6. Railway starts the app with `npm run start`.

## Railway Setup

Create a new Railway project and choose:

- Deploy from GitHub repo.
- Repository: `Ephraimraxy/social-ai-studio`.
- Branch: `main`.
- Build command: Railway will read `railway.json`.
- Start command: Railway will read `railway.json`.

## Required Railway Variables

For this current frontend prototype, Railway only needs:

```text
NODE_ENV=production
PORT=3000
```

Railway usually injects `PORT` automatically, so you do not normally need to set it manually.

For the paid SaaS backend phase, add:

```text
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
DATABASE_URL=
REDIS_URL=
```

## GitHub Repo Setup

Create an empty repository named `social-ai-studio` under `Ephraimraxy`, then push this project:

```powershell
git remote add origin https://github.com/Ephraimraxy/social-ai-studio.git
git branch -M main
git push -u origin main
```

After the first push, connect that repo in Railway.
