function parseAdminEmails(value = '') {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export const appConfig = {
  appName: 'SocialHub',
  baseUrl: process.env.APP_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000',
  authSecret: process.env.AUTH_SECRET || '',
  platformAdminEmails: parseAdminEmails(process.env.PLATFORM_ADMIN_EMAIL || process.env.PLATFORM_ADMIN_EMAILS || process.env.ADMIN_EMAIL || ''),
  dataDir: process.env.DATA_DIR || 'data',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  renderEndpoint: process.env.VIDEO_RENDER_ENDPOINT || '',
  renderApiKey: process.env.VIDEO_RENDER_API_KEY || '',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_SECRET_KEY || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2AccountId: process.env.R2_ACCOUNT_ID || '',
  r2BucketName: process.env.R2_BUCKET_NAME || '',
  r2PublicUrl: process.env.R2_PUBLIC_URL || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  oauthEncryptionKey: process.env.OAUTH_ENCRYPTION_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: process.env.META_APP_SECRET || '',
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY || '',
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  enableDirectPublishing: process.env.ENABLE_DIRECT_PUBLISHING === 'true',
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
