import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { appConfig, requireConfigured } from './config.js';
import { createId, mutateStore, nowIso } from './store.js';

function assetPath(assetId, extension) {
  const folder = resolve(join(appConfig.dataDir, 'assets'));
  mkdirSync(folder, { recursive: true });
  return resolve(join(folder, `${assetId}.${extension}`));
}

export async function createVoiceAsset({ tenantId, campaignId, text }) {
  const assetId = createId('asset');

  if (!appConfig.elevenLabsApiKey) {
    requireConfigured('ElevenLabs voice generation', [
      { name: 'ELEVENLABS_API_KEY', value: appConfig.elevenLabsApiKey },
    ]);
  }
  requireConfigured('ElevenLabs voice generation', [
    { name: 'ELEVENLABS_VOICE_ID', value: appConfig.elevenLabsVoiceId },
    { name: 'ELEVENLABS_MODEL', value: appConfig.elevenLabsModel },
  ]);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${appConfig.elevenLabsVoiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': appConfig.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: appConfig.elevenLabsModel,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs generation failed: ${response.status} ${errorText}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  const path = assetPath(assetId, 'mp3');
  writeFileSync(path, audio);

  return mutateStore((data) => {
    const asset = {
      id: assetId,
      tenantId,
      campaignId,
      type: 'voiceover',
      provider: 'elevenlabs',
      mimeType: 'audio/mpeg',
      path,
      url: `/api/assets/${assetId}`,
      createdAt: nowIso(),
    };
    data.mediaAssets.push(asset);
    return asset;
  });
}

export async function createRenderAsset({ tenantId, campaignId, campaign }) {
  if (!appConfig.renderEndpoint) {
    requireConfigured('Video rendering', [
      { name: 'VIDEO_RENDER_ENDPOINT', value: appConfig.renderEndpoint },
    ]);
  }

  const assetId = createId('asset');
  const path = assetPath(assetId, 'json');

  let renderPlan;

  const response = await fetch(appConfig.renderEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(appConfig.renderApiKey ? { authorization: `Bearer ${appConfig.renderApiKey}` } : {}),
    },
    body: JSON.stringify({
      campaignId,
      title: campaign.title,
      script: campaign.script,
      captions: campaign.captions,
      format: campaign.format,
      platforms: campaign.platforms,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Video renderer request failed');
  }
  renderPlan = {
    ...payload,
    provider: 'external-renderer',
    campaignId,
  };

  writeFileSync(path, JSON.stringify(renderPlan, null, 2));

  return mutateStore((data) => {
    const asset = {
      id: assetId,
      tenantId,
      campaignId,
      type: 'video-render',
      provider: renderPlan.provider,
      mimeType: 'application/json',
      path,
      url: renderPlan.videoUrl || renderPlan.url || `/api/assets/${assetId}`,
      createdAt: nowIso(),
    };
    data.mediaAssets.push(asset);
    return asset;
  });
}
