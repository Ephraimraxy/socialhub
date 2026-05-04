import { appConfig, requireConfigured } from './config.js';

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude response did not contain JSON');
  return JSON.parse(match[0]);
}

export async function generateCampaignDraft(input, brandProfile) {
  if (!appConfig.anthropicApiKey) {
    requireConfigured('Claude campaign generation', [
      { name: 'ANTHROPIC_API_KEY', value: appConfig.anthropicApiKey },
    ]);
  }

  const prompt = [
    'Create a social media campaign draft as strict JSON only.',
    'Schema: {"title":"string","script":["5 short lines"],"captions":[{"platform":"string","mode":"Auto|Hybrid","text":"string","hashtags":"string"}]}',
    `Topic: ${input.topic}`,
    `Audience: ${input.audience}`,
    `Tone: ${input.tone}`,
    `Offer: ${input.offer}`,
    `Format: ${input.format}`,
    `Target platforms: ${input.platforms?.join(', ')}`,
    `Brand voice: ${brandProfile?.voice || 'Not provided'}`,
  ].join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': appConfig.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: appConfig.anthropicModel,
      max_tokens: 1600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude generation failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = payload.content?.find((item) => item.type === 'text')?.text || '';
  return { ...extractJson(text), provider: 'anthropic' };
}
