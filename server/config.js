export const appConfig = {
  appName: 'SocialHub',
  baseUrl: process.env.APP_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000',
  authSecret: process.env.AUTH_SECRET || 'dev-socialhub-auth-secret-change-me',
  dataDir: process.env.DATA_DIR || 'data',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '',
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
