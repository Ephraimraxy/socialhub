import { appConfig } from './config.js';
import { readStore } from './store.js';

function check(id, label, ready, detail, severity = 'required') {
  return { id, label, ready: Boolean(ready), detail, severity };
}

export function getReadiness() {
  const plans = readStore().subscriptionPlans.filter((plan) => plan.active !== false);
  const planCodesReady = plans.length > 0 && plans.every((plan) => Boolean(plan.paystackPlanCode));
  const checks = [
    check('auth_secret', 'Authentication secret', appConfig.authSecret.length >= 32, 'Set AUTH_SECRET to a long random value.'),
    check('paystack_secret', 'Paystack secret key', appConfig.paystackSecretKey, 'Set PAYSTACK_SECRET_KEY.'),
    check('paystack_public', 'Paystack public key', appConfig.paystackPublicKey, 'Set PAYSTACK_PUBLIC_KEY.'),
    check('paystack_plans', 'Paystack subscription plans', planCodesReady, 'Add active Paystack plan codes in Admin Billing Settings.'),
    check('claude', 'Claude API', appConfig.anthropicApiKey && appConfig.anthropicModel, 'Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL.'),
    check('elevenlabs', 'ElevenLabs API', appConfig.elevenLabsApiKey && appConfig.elevenLabsVoiceId && appConfig.elevenLabsModel, 'Set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, and ELEVENLABS_MODEL.'),
    check('renderer', 'Video renderer', appConfig.renderEndpoint, 'Set VIDEO_RENDER_ENDPOINT to your production render worker.'),
    check('r2_storage', 'Cloudflare R2 storage', appConfig.r2AccessKeyId && appConfig.r2AccountId && appConfig.r2BucketName && appConfig.r2PublicUrl && appConfig.r2SecretAccessKey, 'Set R2_ACCESS_KEY_ID, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_PUBLIC_URL, and R2_SECRET_ACCESS_KEY.'),
    check('oauth_vault', 'OAuth token encryption', appConfig.oauthEncryptionKey.length >= 32, 'Set OAUTH_ENCRYPTION_KEY to a long random value.'),
    check('google_oauth', 'Google/YouTube OAuth', appConfig.googleClientId && appConfig.googleClientSecret, 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'),
    check('meta_oauth', 'Meta OAuth', appConfig.metaAppId && appConfig.metaAppSecret, 'Set META_APP_ID and META_APP_SECRET.'),
    check('tiktok_oauth', 'TikTok OAuth', appConfig.tiktokClientKey && appConfig.tiktokClientSecret, 'Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.'),
    check('direct_publishing', 'Direct publishing switch', appConfig.enableDirectPublishing, 'Set ENABLE_DIRECT_PUBLISHING=true only after platform apps and publish adapters are approved.', 'launch'),
  ];

  const requiredReady = checks.filter((item) => item.severity === 'required').every((item) => item.ready);
  const launchReady = checks.every((item) => item.ready);

  return {
    requiredReady,
    launchReady,
    completed: checks.filter((item) => item.ready).length,
    total: checks.length,
    checks,
  };
}
