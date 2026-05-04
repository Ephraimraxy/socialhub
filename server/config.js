export const appConfig = {
  appName: 'SocialHub',
  baseUrl: process.env.APP_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000',
  authSecret: process.env.AUTH_SECRET || '',
  dataDir: process.env.DATA_DIR || 'data',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  elevenLabsModel: process.env.ELEVENLABS_MODEL || '',
  renderEndpoint: process.env.VIDEO_RENDER_ENDPOINT || '',
  renderApiKey: process.env.VIDEO_RENDER_API_KEY || '',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '',
  oauthEncryptionKey: process.env.OAUTH_ENCRYPTION_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: process.env.META_APP_SECRET || '',
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY || '',
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  enableDirectPublishing: process.env.ENABLE_DIRECT_PUBLISHING === 'true',
};

export const subscriptionPlans = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 25000,
    currency: 'NGN',
    campaignLimit: 30,
    platformLimit: 4,
    paystackPlanCode: process.env.PAYSTACK_PLAN_STARTER || '',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 65000,
    currency: 'NGN',
    campaignLimit: 120,
    platformLimit: 4,
    paystackPlanCode: process.env.PAYSTACK_PLAN_GROWTH || '',
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceMonthly: 150000,
    currency: 'NGN',
    campaignLimit: 400,
    platformLimit: 4,
    paystackPlanCode: process.env.PAYSTACK_PLAN_AGENCY || '',
  },
};

export const platformCatalog = [
  {
    id: 'youtube',
    name: 'YouTube',
    automation: 'direct',
    provider: 'google',
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    requirements: ['Google OAuth app', 'YouTube API audit for public uploads'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    automation: 'direct',
    provider: 'meta',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    requirements: ['Meta app review', 'Business or Creator Instagram account'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    automation: 'direct',
    provider: 'meta',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    requirements: ['Meta app review', 'Facebook Page access'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    automation: 'hybrid',
    provider: 'tiktok',
    scopes: ['video.publish', 'video.upload'],
    requirements: ['TikTok Content Posting API audit', 'Manual approval fallback'],
  },
];

export function formatMoney(plan) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.priceMonthly);
}

export function requireConfigured(integrationName, values) {
  const missing = values.filter((item) => !item.value).map((item) => item.name);
  if (!missing.length) return;

  const error = new Error(`${integrationName} is not configured. Set ${missing.join(', ')} in Railway variables.`);
  error.status = 503;
  throw error;
}
