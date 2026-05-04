import { createReadStream, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { hashPassword, createToken, requireUser, verifyPassword, verifyToken, getBearerToken } from './auth.js';
import { appConfig, formatMoney, platformCatalog, subscriptionPlans } from './config.js';
import { generateCampaignDraft } from './ai.js';
import { buildAuthorizationUrl, encryptTokenPayload, exchangeOAuthCode } from './oauth.js';
import { getReadiness } from './readiness.js';
import { createRenderAsset, createVoiceAsset } from './voice.js';
import { getPlan, initializeCheckout, verifyPaystackSignature } from './paystack.js';
import {
  createId,
  getTenantBundle,
  mutateStore,
  nowIso,
  publicUser,
  readStore,
} from './store.js';
import { handleError, readJson, readRequestBody, sendJson, sendNoContent } from './http.js';

const assetTypes = {
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!body[field] || String(body[field]).trim().length < 2) {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }
}

function bootstrapPayload(user) {
  const data = readStore();
  const bundle = getTenantBundle(data, user.tenantId);
  return {
    user,
    tenant: bundle.tenant,
    subscription: bundle.subscription,
    brandProfile: bundle.brandProfile,
    platforms: platformCatalog.map((platform) => {
      const account = bundle.platformAccounts.find((item) => item.platformId === platform.id);
      return {
        ...platform,
        connected: Boolean(account?.connected),
        handle: account?.handle || '',
        accountId: account?.accountId || '',
        status: account?.status || 'not_connected',
        connectedAt: account?.connectedAt || null,
      };
    }),
    campaigns: bundle.campaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    publishJobs: bundle.publishJobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    readiness: getReadiness(),
    plans: Object.values(subscriptionPlans).map((plan) => ({
      ...plan,
      displayPrice: formatMoney(plan),
    })),
  };
}

async function register(request, response) {
  const body = await readJson(request);
  requireFields(body, ['name', 'email', 'password', 'company']);
  const email = normalizeEmail(body.email);

  const result = mutateStore((data) => {
    if (data.users.some((user) => user.email === email)) {
      const error = new Error('Email already registered');
      error.status = 409;
      throw error;
    }

    const tenant = {
      id: createId('tenant'),
      name: body.company.trim(),
      createdAt: nowIso(),
    };
    const user = {
      id: createId('user'),
      tenantId: tenant.id,
      name: body.name.trim(),
      email,
      passwordHash: hashPassword(body.password),
      role: 'owner',
      createdAt: nowIso(),
    };
    const brandProfile = {
      id: createId('brand'),
      tenantId: tenant.id,
      voice: '',
      audience: '',
      offer: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const subscription = {
      id: createId('sub'),
      tenantId: tenant.id,
      planId: 'starter',
      provider: 'none',
      status: 'trialing',
      currentPeriodEnd: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    data.tenants.push(tenant);
    data.users.push(user);
    data.brandProfiles.push(brandProfile);
    data.subscriptions.push(subscription);

    return { user: publicUser(user), tenant };
  });

  sendJson(response, 201, {
    token: createToken(result.user),
    ...bootstrapPayload(result.user),
  });
}

async function login(request, response) {
  const body = await readJson(request);
  requireFields(body, ['email', 'password']);
  const email = normalizeEmail(body.email);
  const data = readStore();
  const user = data.users.find((item) => item.email === email);

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const safeUser = publicUser(user);
  sendJson(response, 200, {
    token: createToken(safeUser),
    ...bootstrapPayload(safeUser),
  });
}

function me(request, response) {
  const user = verifyToken(getBearerToken(request));
  if (!user) {
    sendJson(response, 200, { user: null });
    return;
  }
  sendJson(response, 200, bootstrapPayload(user));
}

async function updateBrandProfile(request, response) {
  const user = requireUser(request);
  const body = await readJson(request);

  const profile = mutateStore((data) => {
    const existing = data.brandProfiles.find((item) => item.tenantId === user.tenantId);
    if (!existing) {
      const created = {
        id: createId('brand'),
        tenantId: user.tenantId,
        voice: body.voice || '',
        audience: body.audience || '',
        offer: body.offer || '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      data.brandProfiles.push(created);
      return created;
    }

    existing.voice = body.voice ?? existing.voice;
    existing.audience = body.audience ?? existing.audience;
    existing.offer = body.offer ?? existing.offer;
    existing.updatedAt = nowIso();
    return existing;
  });

  sendJson(response, 200, { brandProfile: profile });
}

async function connectPlatform(request, response, platformId) {
  requireUser(request);
  const platform = platformCatalog.find((item) => item.id === platformId);

  if (!platform) {
    const error = new Error('Unknown platform');
    error.status = 404;
    throw error;
  }

  const error = new Error('Live platform linking must use OAuth. Use /api/oauth/:platform/start.');
  error.status = 409;
  throw error;
}

async function startOAuth(request, response, platformId) {
  const user = requireUser(request);
  const platform = platformCatalog.find((item) => item.id === platformId);

  if (!platform) {
    const error = new Error('Unknown platform');
    error.status = 404;
    throw error;
  }

  const state = createId('oauth');
  const authorizationUrl = buildAuthorizationUrl({ platformId, state });

  mutateStore((data) => {
    data.oauthStates.push({
      id: state,
      tenantId: user.tenantId,
      userId: user.id,
      platformId,
      provider: platform.provider,
      createdAt: nowIso(),
    });
  });

  sendJson(response, 200, { authorizationUrl, platform });
}

async function oauthCallback(request, response, provider) {
  const url = new URL(request.url, 'http://localhost');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    response.writeHead(302, { location: '/?oauth=missing_code' });
    response.end();
    return;
  }

  const oauthState = readStore().oauthStates.find((item) => item.id === state && item.provider === provider);
  if (!oauthState) {
    response.writeHead(302, { location: '/?oauth=invalid_state' });
    response.end();
    return;
  }

  try {
    const tokenPayload = await exchangeOAuthCode({
      provider,
      code,
      platformId: oauthState.platformId,
    });
    const encryptedToken = encryptTokenPayload(tokenPayload);
    const platform = platformCatalog.find((item) => item.id === oauthState.platformId);

    mutateStore((data) => {
      data.oauthStates = data.oauthStates.filter((item) => item.id !== state);
      const existing = data.platformAccounts.find(
        (item) => item.tenantId === oauthState.tenantId && item.platformId === oauthState.platformId,
      );

      if (existing) {
        existing.connected = true;
        existing.status = 'connected';
        existing.encryptedToken = encryptedToken;
        existing.tokenRef = `oauth:${provider}:${oauthState.platformId}`;
        existing.connectedAt = nowIso();
        existing.updatedAt = nowIso();
        return;
      }

      data.platformAccounts.push({
        id: createId('acct'),
        tenantId: oauthState.tenantId,
        platformId: oauthState.platformId,
        provider,
        connected: true,
        status: 'connected',
        handle: platform?.name || oauthState.platformId,
        accountId: '',
        tokenRef: `oauth:${provider}:${oauthState.platformId}`,
        encryptedToken,
        connectedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    });

    response.writeHead(302, { location: '/?oauth=connected' });
    response.end();
  } catch (error) {
    console.error(error);
    response.writeHead(302, { location: `/?oauth=failed&provider=${encodeURIComponent(provider)}` });
    response.end();
  }
}

async function createCheckout(request, response) {
  const user = requireUser(request);
  const body = await readJson(request);
  const plan = getPlan(body.planId || body.plan || 'starter');
  const data = readStore();
  const tenant = data.tenants.find((item) => item.id === user.tenantId);
  const checkout = await initializeCheckout({ user, tenant, planId: plan.id });

  mutateStore((draft) => {
    const subscription = draft.subscriptions.find((item) => item.tenantId === user.tenantId);
    if (subscription) {
      subscription.planId = plan.id;
      subscription.provider = checkout.provider;
      subscription.status = 'checkout_started';
      subscription.checkoutReference = checkout.reference;
      subscription.updatedAt = nowIso();
    }
  });

  sendJson(response, 200, checkout);
}

async function paystackWebhook(request, response) {
  const rawBody = await readRequestBody(request, 1024 * 1024);
  const signature = request.headers['x-paystack-signature'];

  if (!verifyPaystackSignature(rawBody, signature)) {
    const error = new Error('Invalid Paystack signature');
    error.status = 401;
    throw error;
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  mutateStore((data) => {
    data.billingEvents.push({
      id: createId('evt'),
      provider: 'paystack',
      event: event.event,
      payload: event.data,
      createdAt: nowIso(),
    });

    const tenantId = event.data?.metadata?.tenantId;
    const planId = event.data?.metadata?.planId || 'starter';
    if (!tenantId) return;

    const subscription = data.subscriptions.find((item) => item.tenantId === tenantId);
    if (!subscription) return;

    if (event.event === 'charge.success' || event.event === 'subscription.create') {
      subscription.provider = 'paystack';
      subscription.planId = planId;
      subscription.status = 'active';
      subscription.customerCode = event.data?.customer?.customer_code || subscription.customerCode;
      subscription.authorizationCode = event.data?.authorization?.authorization_code || subscription.authorizationCode;
      subscription.updatedAt = nowIso();
    }

    if (event.event === 'subscription.disable') {
      subscription.status = 'cancelled';
      subscription.updatedAt = nowIso();
    }
  });

  sendNoContent(response);
}

async function generateCampaign(request, response) {
  const user = requireUser(request);
  const body = await readJson(request);
  requireFields(body, ['topic']);
  const data = readStore();
  const brandProfile = data.brandProfiles.find((item) => item.tenantId === user.tenantId);
  const draft = await generateCampaignDraft(body, brandProfile);

  const campaign = mutateStore((store) => {
    const item = {
      id: createId('camp'),
      tenantId: user.tenantId,
      topic: body.topic,
      audience: body.audience || brandProfile?.audience || '',
      tone: body.tone || brandProfile?.voice || '',
      offer: body.offer || brandProfile?.offer || '',
      format: body.format || 'short-form video',
      platforms: body.platforms || ['youtube', 'instagram', 'facebook', 'tiktok'],
      status: 'draft',
      title: draft.title,
      script: draft.script,
      captions: draft.captions,
      provider: draft.provider,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.campaigns.push(item);
    return item;
  });

  sendJson(response, 201, { campaign });
}

async function createVoice(request, response, campaignId) {
  const user = requireUser(request);
  const data = readStore();
  const campaign = data.campaigns.find((item) => item.id === campaignId && item.tenantId === user.tenantId);

  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }

  const text = campaign.script.join(' ');
  const asset = await createVoiceAsset({ tenantId: user.tenantId, campaignId, text });
  mutateStore((store) => {
    const item = store.campaigns.find((campaignItem) => campaignItem.id === campaignId);
    item.voiceAssetId = asset.id;
    item.status = 'voice_ready';
    item.updatedAt = nowIso();
  });
  sendJson(response, 201, { asset });
}

async function createRender(request, response, campaignId) {
  const user = requireUser(request);
  const data = readStore();
  const campaign = data.campaigns.find((item) => item.id === campaignId && item.tenantId === user.tenantId);

  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }

  const asset = await createRenderAsset({ tenantId: user.tenantId, campaignId, campaign });
  mutateStore((store) => {
    const item = store.campaigns.find((campaignItem) => campaignItem.id === campaignId);
    item.renderAssetId = asset.id;
    item.status = 'render_ready';
    item.updatedAt = nowIso();
  });
  sendJson(response, 201, { asset });
}

async function scheduleCampaign(request, response, campaignId) {
  const user = requireUser(request);
  const body = await readJson(request);
  const data = readStore();
  const campaign = data.campaigns.find((item) => item.id === campaignId && item.tenantId === user.tenantId);

  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }

  const accounts = data.platformAccounts.filter((item) => item.tenantId === user.tenantId && item.connected);
  if (!campaign.renderAssetId) {
    const error = new Error('Create a video render asset before scheduling this campaign.');
    error.status = 409;
    throw error;
  }

  const jobs = mutateStore((store) => {
    const created = campaign.platforms.map((platformId) => {
      const platform = platformCatalog.find((item) => item.id === platformId);
      const connected = accounts.some((account) => account.platformId === platformId);
      const job = {
        id: createId('job'),
        tenantId: user.tenantId,
        campaignId,
        platformId,
        status: connected ? 'ready_for_live_publish' : 'blocked',
        publishAt: body.publishAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        mode: platform?.automation || 'direct',
        error: connected ? '' : 'Platform account is not connected',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      store.publishJobs.push(job);
      return job;
    });

    const item = store.campaigns.find((campaignItem) => campaignItem.id === campaignId);
    item.status = 'scheduled';
    item.updatedAt = nowIso();
    return created;
  });

  sendJson(response, 201, { jobs });
}

async function runPublishJob(request, response, jobId) {
  const user = requireUser(request);
  if (!appConfig.enableDirectPublishing) {
    const error = new Error('Direct publishing is disabled. Set ENABLE_DIRECT_PUBLISHING=true only after platform OAuth, app reviews, and upload adapters are approved.');
    error.status = 503;
    throw error;
  }

  const job = mutateStore((data) => {
    const item = data.publishJobs.find((candidate) => candidate.id === jobId && candidate.tenantId === user.tenantId);
    if (!item) {
      const error = new Error('Publish job not found');
      error.status = 404;
      throw error;
    }

    if (item.status === 'blocked') return item;
    const error = new Error(`Live ${item.platformId} publishing adapter is not enabled for this deployment.`);
    error.status = 501;
    throw error;
  });

  sendJson(response, 200, { job });
}

function listAssets(request, response, assetId) {
  const user = requireUser(request);
  const data = readStore();
  const asset = data.mediaAssets.find((item) => item.id === assetId && item.tenantId === user.tenantId);

  if (!asset || !existsSync(asset.path)) {
    const error = new Error('Asset not found');
    error.status = 404;
    throw error;
  }

  response.writeHead(200, {
    'content-type': asset.mimeType || assetTypes[extname(asset.path)] || 'application/octet-stream',
  });
  createReadStream(asset.path).pipe(response);
}

export async function handleApi(request, response) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      sendNoContent(response);
      return true;
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      await register(request, response);
      return true;
    }
    if (request.method === 'POST' && pathname === '/api/auth/login') {
      await login(request, response);
      return true;
    }
    if (request.method === 'GET' && pathname === '/api/me') {
      me(request, response);
      return true;
    }
    if (request.method === 'GET' && pathname === '/api/system/readiness') {
      requireUser(request);
      sendJson(response, 200, { readiness: getReadiness() });
      return true;
    }
    if (request.method === 'PUT' && pathname === '/api/brand-profile') {
      await updateBrandProfile(request, response);
      return true;
    }
    if (request.method === 'POST' && pathname === '/api/billing/checkout') {
      await createCheckout(request, response);
      return true;
    }
    if (request.method === 'POST' && pathname === '/api/billing/paystack/webhook') {
      await paystackWebhook(request, response);
      return true;
    }
    if (request.method === 'POST' && pathname === '/api/campaigns/generate') {
      await generateCampaign(request, response);
      return true;
    }

    const oauthStartMatch = pathname.match(/^\/api\/oauth\/([^/]+)\/start$/);
    if (request.method === 'POST' && oauthStartMatch) {
      await startOAuth(request, response, oauthStartMatch[1]);
      return true;
    }

    const oauthCallbackMatch = pathname.match(/^\/api\/oauth\/([^/]+)\/callback$/);
    if (request.method === 'GET' && oauthCallbackMatch) {
      await oauthCallback(request, response, oauthCallbackMatch[1]);
      return true;
    }

    const platformMatch = pathname.match(/^\/api\/platforms\/([^/]+)\/connect$/);
    if (request.method === 'POST' && platformMatch) {
      await connectPlatform(request, response, platformMatch[1]);
      return true;
    }

    const voiceMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/voice$/);
    if (request.method === 'POST' && voiceMatch) {
      await createVoice(request, response, voiceMatch[1]);
      return true;
    }

    const renderMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/render$/);
    if (request.method === 'POST' && renderMatch) {
      await createRender(request, response, renderMatch[1]);
      return true;
    }

    const scheduleMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/schedule$/);
    if (request.method === 'POST' && scheduleMatch) {
      await scheduleCampaign(request, response, scheduleMatch[1]);
      return true;
    }

    const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/run$/);
    if (request.method === 'POST' && jobMatch) {
      await runPublishJob(request, response, jobMatch[1]);
      return true;
    }

    const assetMatch = pathname.match(/^\/api\/assets\/([^/]+)$/);
    if (request.method === 'GET' && assetMatch) {
      listAssets(request, response, assetMatch[1]);
      return true;
    }

    return false;
  } catch (error) {
    handleError(response, error);
    return true;
  }
}
