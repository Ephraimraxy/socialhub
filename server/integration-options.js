import { appConfig } from './config.js';

export const fallbackClaudeModels = [];

export const fallbackElevenLabsModels = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5' },
  { id: 'eleven_v3', name: 'Eleven v3' },
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${errorText}`);
  }
  return response.json();
}

async function listClaudeModels() {
  if (!appConfig.anthropicApiKey) return fallbackClaudeModels;
  const payload = await fetchJson('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': appConfig.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  return (payload.data || []).map((model) => ({
    id: model.id,
    name: model.display_name || model.id,
  }));
}

async function listElevenLabsModels() {
  if (!appConfig.elevenLabsApiKey) return [];
  const payload = await fetchJson('https://api.elevenlabs.io/v1/models', {
    headers: { 'xi-api-key': appConfig.elevenLabsApiKey },
  });
  const models = (Array.isArray(payload) ? payload : [])
    .filter((model) => model.can_do_text_to_speech !== false)
    .map((model) => ({
      id: model.model_id,
      name: model.name || model.model_id,
    }));
  return models.length ? models : fallbackElevenLabsModels;
}

async function listElevenLabsVoices() {
  if (!appConfig.elevenLabsApiKey) return [];
  const payload = await fetchJson('https://api.elevenlabs.io/v2/voices?page_size=100', {
    headers: { 'xi-api-key': appConfig.elevenLabsApiKey },
  });
  return (payload.voices || []).map((voice) => ({
    id: voice.voice_id,
    name: voice.name || voice.voice_id,
    category: voice.category || '',
  }));
}

async function settle(label, task, fallback) {
  try {
    return { label, items: await task(), error: '' };
  } catch (error) {
    return { label, items: fallback, error: error.message };
  }
}

export async function listIntegrationOptions() {
  const [claude, elevenModels, elevenVoices] = await Promise.all([
    settle('claudeModels', listClaudeModels, fallbackClaudeModels),
    settle('elevenLabsModels', listElevenLabsModels, []),
    settle('elevenLabsVoices', listElevenLabsVoices, []),
  ]);

  return {
    claudeModels: claude.items,
    elevenLabsModels: elevenModels.items,
    elevenLabsVoices: elevenVoices.items,
    errors: [claude, elevenModels, elevenVoices]
      .filter((result) => result.error)
      .map((result) => ({ source: result.label, error: result.error })),
  };
}
