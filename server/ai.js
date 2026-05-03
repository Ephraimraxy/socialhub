import { appConfig, platformCatalog } from './config.js';

function fallbackCampaign(input) {
  const platforms = platformCatalog.filter((platform) => input.platforms?.includes(platform.id));
  const audience = input.audience || 'business owners';
  const topic = input.topic || 'How to turn one idea into daily social content';
  const tone = input.tone || 'confident and practical';

  return {
    title: topic.length > 74 ? `${topic.slice(0, 74)}...` : topic,
    script: [
      `Hook: ${audience} are losing time by recreating the same message for every platform.`,
      `Problem: every channel needs a different title, caption, aspect ratio, and approval path.`,
      `Solution: start with one approved idea, then turn it into scripts, voiceover, video, captions, and scheduled jobs.`,
      `Proof: YouTube and Meta support direct publishing after approval, while TikTok can use direct post or manual completion.`,
      `CTA: choose one daily content package and let the system handle the production line.`,
    ],
    captions: platforms.map((platform) => ({
      platform: platform.name,
      mode: platform.id === 'tiktok' ? 'Hybrid' : 'Auto',
      text: `${tone} ${platform.name} caption for ${audience}: ${topic}`,
      hashtags:
        platform.id === 'youtube'
          ? '#Shorts #BusinessGrowth #ContentSystem'
          : platform.id === 'tiktok'
            ? '#SmallBusiness #AITools #DailyContent'
            : '#SocialMediaMarketing #Entrepreneurship #ContentCreation',
    })),
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude response did not contain JSON');
  return JSON.parse(match[0]);
}

export async function generateCampaignDraft(input, brandProfile) {
  if (!appConfig.anthropicApiKey) {
    return { ...fallbackCampaign(input), provider: 'mock' };
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
    `Brand voice: ${brandProfile?.voice || 'clear, useful, conversion-focused'}`,
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
