import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { appConfig, platformCatalog, requireConfigured } from './config.js';

function encryptionKey() {
  requireConfigured('OAuth token vault', [{ name: 'OAUTH_ENCRYPTION_KEY', value: appConfig.oauthEncryptionKey }]);
  return createHash('sha256').update(appConfig.oauthEncryptionKey).digest();
}

export function encryptTokenPayload(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptTokenPayload(encrypted) {
  const [iv, tag, ciphertext] = encrypted.split('.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plain);
}

export function providerForPlatform(platformId) {
  const platform = platformCatalog.find((item) => item.id === platformId);
  if (!platform) {
    const error = new Error('Unknown platform');
    error.status = 404;
    throw error;
  }
  return platform.provider;
}

export function oauthConfigForPlatform(platformId) {
  const platform = platformCatalog.find((item) => item.id === platformId);
  if (!platform) {
    const error = new Error('Unknown platform');
    error.status = 404;
    throw error;
  }

  if (platform.provider === 'google') {
    requireConfigured('Google OAuth', [
      { name: 'GOOGLE_CLIENT_ID', value: appConfig.googleClientId },
      { name: 'GOOGLE_CLIENT_SECRET', value: appConfig.googleClientSecret },
      { name: 'OAUTH_ENCRYPTION_KEY', value: appConfig.oauthEncryptionKey },
    ]);
    return {
      provider: 'google',
      clientId: appConfig.googleClientId,
      clientSecret: appConfig.googleClientSecret,
      redirectUri: `${appConfig.baseUrl.replace(/\/$/, '')}/api/oauth/google/callback`,
      authBase: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: platform.scopes,
    };
  }

  if (platform.provider === 'meta') {
    requireConfigured('Meta OAuth', [
      { name: 'META_APP_ID', value: appConfig.metaAppId },
      { name: 'META_APP_SECRET', value: appConfig.metaAppSecret },
      { name: 'OAUTH_ENCRYPTION_KEY', value: appConfig.oauthEncryptionKey },
    ]);
    return {
      provider: 'meta',
      clientId: appConfig.metaAppId,
      clientSecret: appConfig.metaAppSecret,
      redirectUri: `${appConfig.baseUrl.replace(/\/$/, '')}/api/oauth/meta/callback`,
      authBase: 'https://www.facebook.com/v21.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
      scopes: platform.scopes,
    };
  }

  if (platform.provider === 'tiktok') {
    requireConfigured('TikTok OAuth', [
      { name: 'TIKTOK_CLIENT_KEY', value: appConfig.tiktokClientKey },
      { name: 'TIKTOK_CLIENT_SECRET', value: appConfig.tiktokClientSecret },
      { name: 'OAUTH_ENCRYPTION_KEY', value: appConfig.oauthEncryptionKey },
    ]);
    return {
      provider: 'tiktok',
      clientId: appConfig.tiktokClientKey,
      clientSecret: appConfig.tiktokClientSecret,
      redirectUri: `${appConfig.baseUrl.replace(/\/$/, '')}/api/oauth/tiktok/callback`,
      authBase: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
      scopes: platform.scopes,
    };
  }

  const error = new Error('Unsupported OAuth provider');
  error.status = 501;
  throw error;
}

export function buildAuthorizationUrl({ platformId, state }) {
  const config = oauthConfigForPlatform(platformId);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(config.provider === 'google' ? ' ' : ','),
    state,
  });

  if (config.provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('include_granted_scopes', 'true');
  }

  if (config.provider === 'tiktok') {
    params.delete('client_id');
    params.set('client_key', config.clientId);
  }

  return `${config.authBase}?${params.toString()}`;
}

export async function exchangeOAuthCode({ provider, code, platformId }) {
  const config = oauthConfigForPlatform(platformId);
  if (config.provider !== provider) {
    const error = new Error('OAuth provider/platform mismatch');
    error.status = 400;
    throw error;
  }

  if (provider === 'google') {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    return parseTokenResponse(response, 'Google');
  }

  if (provider === 'meta') {
    const url = new URL(config.tokenUrl);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }).toString();
    const response = await fetch(url);
    return parseTokenResponse(response, 'Meta');
  }

  if (provider === 'tiktok') {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });
    return parseTokenResponse(response, 'TikTok');
  }

  const error = new Error('Unsupported OAuth provider');
  error.status = 501;
  throw error;
}

async function parseTokenResponse(response, providerName) {
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(`${providerName} OAuth token exchange failed: ${payload.error_description || payload.error?.message || payload.message || response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}
