import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { appConfig } from './config.js';

const storePath = resolve(join(appConfig.dataDir, 'socialhub.json'));

const initTime = new Date().toISOString();

const initialData = {
  users: [],
  tenants: [],
  brandProfiles: [],
  platformAccounts: [],
  subscriptions: [],
  campaigns: [],
  mediaAssets: [],
  publishJobs: [],
  billingEvents: [],
  oauthStates: [],
  integrationSettings: {
    anthropicModel: '',
    elevenLabsModel: 'eleven_multilingual_v2',
    elevenLabsVoiceId: '',
    updatedAt: initTime,
  },
  subscriptionPlans: [
    {
      id: 'starter',
      name: 'Starter',
      priceMonthly: 25000,
      currency: 'NGN',
      campaignLimit: 30,
      platformLimit: 4,
      paystackPlanCode: '',
      active: true,
      createdAt: initTime,
      updatedAt: initTime,
    },
    {
      id: 'growth',
      name: 'Growth',
      priceMonthly: 65000,
      currency: 'NGN',
      campaignLimit: 120,
      platformLimit: 4,
      paystackPlanCode: '',
      active: true,
      createdAt: initTime,
      updatedAt: initTime,
    },
    {
      id: 'agency',
      name: 'Agency',
      priceMonthly: 150000,
      currency: 'NGN',
      campaignLimit: 400,
      platformLimit: 4,
      paystackPlanCode: '',
      active: true,
      createdAt: initTime,
      updatedAt: initTime,
    },
  ],
};

function ensureStore() {
  mkdirSync(dirname(storePath), { recursive: true });
  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify(initialData, null, 2));
  }
}

export function readStore() {
  ensureStore();
  const raw = readFileSync(storePath, 'utf8');
  return { ...initialData, ...JSON.parse(raw) };
}

export function writeStore(nextData) {
  ensureStore();
  const tempPath = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, JSON.stringify(nextData, null, 2));
  renameSync(tempPath, storePath);
}

export function mutateStore(mutator) {
  const data = readStore();
  const result = mutator(data);
  writeStore(data);
  return result;
}

export function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getIntegrationSettings(data = readStore()) {
  return {
    ...initialData.integrationSettings,
    ...(data.integrationSettings || {}),
  };
}

export function isPlatformAdmin(user) {
  if (!user) return false;
  return appConfig.platformAdminEmails.includes(String(user.email || '').trim().toLowerCase());
}

export function publicUser(user, data) {
  if (!user) return null;
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    platformAdmin: isPlatformAdmin(user),
    onboarded: user.onboarded !== false,
    avatar: user.avatar || '',
    createdAt: user.createdAt,
  };
}

export function getTenantBundle(data, tenantId) {
  const tenant = data.tenants.find((item) => item.id === tenantId);
  const subscription = data.subscriptions.find((item) => item.tenantId === tenantId) || null;
  const brandProfile = data.brandProfiles.find((item) => item.tenantId === tenantId) || null;
  const platformAccounts = data.platformAccounts.filter((item) => item.tenantId === tenantId);
  const campaigns = data.campaigns.filter((item) => item.tenantId === tenantId);
  const publishJobs = data.publishJobs.filter((item) => item.tenantId === tenantId);

  return { tenant, subscription, brandProfile, platformAccounts, campaigns, publishJobs };
}
