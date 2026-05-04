# SocialHub SaaS Blueprint

## Product Goal

Build a subscription SaaS where each client connects their social profiles, defines their brand voice, generates daily content with Claude, creates voice/video assets, and publishes or schedules posts across YouTube, Facebook, Instagram, and TikTok.

## Reality Check

This is achievable, but it should be built in phases. YouTube, Instagram, Facebook, and TikTok all require OAuth, permission review, token security, and compliance pages before production posting for real users.

TikTok should support two paths:

- Direct post for approved apps.
- Inbox/manual approval fallback when direct post is unavailable.

## Product Workflow

1. Client signs up and pays with Paystack.
2. Client creates a brand profile.
3. Client connects platform accounts through OAuth.
4. Client enters a topic or chooses a content calendar prompt.
5. Claude generates script, title, caption, hashtags, and platform variants.
6. ElevenLabs generates voiceover.
7. A render service creates vertical video assets.
8. Client approves the final campaign.
9. The backend queues publishing jobs.
10. Platform APIs publish directly, schedule, or request manual TikTok approval.

## Production Architecture

Frontend:

- React
- Vite
- Role-based dashboard
- Approval queue
- Platform connection center
- Content factory
- Billing and usage views

Backend:

- Node.js API
- File-backed store for the first deployable product version
- PostgreSQL adapter for the production hardening phase
- Redis queue for the production hardening phase
- Object storage for video and audio assets
- Encrypted OAuth token storage
- Paystack subscription and webhook processing
- Optional Stripe adapter for later international expansion

AI and Media:

- Anthropic Claude API for scripts and captions
- ElevenLabs API for voiceover
- Remotion, Creatomate, or equivalent render worker for video
- Optional background music and stock media providers later

Publishing:

- YouTube Data API
- Instagram Graph API Content Publishing
- Facebook Pages API
- TikTok Content Posting API
- Buffer or Zapier as a temporary fallback only

## Ten-Week Build Plan

### Phase 1: Foundation, Week 1-2

- Build React dashboard.
- Create Node API.
- Add user auth and tenant model.
- Add Paystack subscriptions.
- Create database schema.

### Phase 2: AI Factory, Week 3-4

- Add Claude API prompt templates.
- Store brand voice profiles.
- Generate campaign drafts.
- Add ElevenLabs voiceover jobs.
- Add video render jobs.

### Phase 3: Publishing, Week 5-7

- Add OAuth for YouTube, Meta, and TikTok.
- Store encrypted tokens.
- Add publishing queue.
- Implement retries and status logs.
- Add TikTok fallback approval flow.

### Phase 4: Compliance, Week 8-9

- Create privacy policy.
- Create terms of service.
- Create permission review screens.
- Submit Google verification.
- Submit Meta app review.
- Prepare TikTok audit materials.

### Phase 5: Launch, Week 10

- Add onboarding.
- Add usage limits.
- Add client analytics.
- Add admin support dashboard.
- Start with 5-20 paid beta clients.

## Database Sketch

- `users`: identity, email, role
- `tenants`: client organization
- `subscriptions`: Paystack plan, status, and authorization reference
- `brand_profiles`: tone, audience, offer, forbidden words
- `platform_accounts`: provider, account id, token reference, scopes
- `campaigns`: topic, generated copy, status, approval state
- `media_assets`: audio, video, thumbnails, storage keys
- `publish_jobs`: platform, schedule time, status, error logs

## Important Risks

- API reviews can take weeks.
- Token security must be handled carefully.
- YouTube uploads have high quota cost.
- Instagram publishing requires Business or Creator accounts.
- Facebook publishing should focus on Pages.
- TikTok direct posting is approval-dependent.

## Best First Implementation

The current deployable app includes auth, tenant creation, Paystack checkout initialization, Claude campaign generation, ElevenLabs voice generation, external render endpoint support, encrypted OAuth token storage, and a publishing queue that refuses to mark posts complete unless live publishing is explicitly enabled. The production hardening step is to replace file persistence with PostgreSQL and complete platform app reviews before enabling direct publishing.
