const tokenKey = 'socialhub_token';

export function getToken() {
  return window.localStorage.getItem(tokenKey) || '';
}

export function setToken(token) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
  } else {
    window.localStorage.removeItem(tokenKey);
  }
}

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.error || payload || 'Request failed');
  }

  return payload;
}

export const api = {
  me: () => apiRequest('/api/me'),
  readiness: () => apiRequest('/api/system/readiness'),
  register: (body) => apiRequest('/api/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/api/auth/login', { method: 'POST', body }),
  updateBrandProfile: (body) => apiRequest('/api/brand-profile', { method: 'PUT', body }),
  connectPlatform: (platformId, body) =>
    apiRequest(`/api/platforms/${platformId}/connect`, { method: 'POST', body }),
  startOAuth: (platformId) => apiRequest(`/api/oauth/${platformId}/start`, { method: 'POST' }),
  checkout: (planId) => apiRequest('/api/billing/checkout', { method: 'POST', body: { planId } }),
  generateCampaign: (body) => apiRequest('/api/campaigns/generate', { method: 'POST', body }),
  createVoice: (campaignId) => apiRequest(`/api/campaigns/${campaignId}/voice`, { method: 'POST' }),
  createRender: (campaignId) => apiRequest(`/api/campaigns/${campaignId}/render`, { method: 'POST' }),
  scheduleCampaign: (campaignId, body) =>
    apiRequest(`/api/campaigns/${campaignId}/schedule`, { method: 'POST', body }),
  runJob: (jobId) => apiRequest(`/api/jobs/${jobId}/run`, { method: 'POST' }),
};
