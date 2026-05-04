import { createHmac, timingSafeEqual } from 'node:crypto';
import { appConfig, requireConfigured } from './config.js';
import { createId, readStore } from './store.js';

export function getPlan(planId) {
  const plans = readStore().subscriptionPlans;
  const plan = plans.find((item) => item.id === (planId || 'starter') && item.active !== false);
  if (!plan) {
    const error = new Error('Unknown subscription plan');
    error.status = 400;
    throw error;
  }
  return plan;
}

export async function initializeCheckout({ user, tenant, planId }) {
  const plan = getPlan(planId);
  const reference = createId('pay');
  const amount = plan.priceMonthly * 100;

  if (!appConfig.paystackSecretKey) {
    requireConfigured('Paystack billing', [
      { name: 'PAYSTACK_SECRET_KEY', value: appConfig.paystackSecretKey },
    ]);
  }

  if (!plan.paystackPlanCode) {
    const error = new Error('This subscription plan is missing its Paystack plan code. Add the plan code in Admin Billing Settings before checkout.');
    error.status = 503;
    throw error;
  }

  const payload = {
    email: user.email,
    amount,
    currency: plan.currency,
    reference,
    callback_url: `${appConfig.baseUrl.replace(/\/$/, '')}/billing/callback`,
    metadata: {
      tenantId: tenant.id,
      planId: plan.id,
      source: 'socialhub',
    },
  };

  payload.plan = plan.paystackPlanCode;

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${appConfig.paystackSecretKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Paystack checkout initialization failed');
  }

  return {
    provider: 'paystack',
    reference,
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    plan,
  };
}

export function verifyPaystackSignature(rawBody, signature) {
  if (!appConfig.paystackWebhookSecret || !signature) return false;
  const expected = createHmac('sha512', appConfig.paystackWebhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}
