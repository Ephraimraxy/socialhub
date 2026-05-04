import { createHash, createHmac } from 'node:crypto';
import { appConfig, requireConfigured } from './config.js';

function sha256(value, encoding = 'hex') {
  return createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return createHmac('sha256', key).update(value).digest(encoding);
}

function signingKey(secret, dateStamp) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function encodeObjectKey(key) {
  return key.split('/').map((part) => encodeURIComponent(part)).join('/');
}

export function isR2Configured() {
  return Boolean(
    appConfig.r2AccessKeyId &&
      appConfig.r2AccountId &&
      appConfig.r2BucketName &&
      appConfig.r2PublicUrl &&
      appConfig.r2SecretAccessKey,
  );
}

export function requireR2Configured() {
  requireConfigured('Cloudflare R2 storage', [
    { name: 'R2_ACCESS_KEY_ID', value: appConfig.r2AccessKeyId },
    { name: 'R2_ACCOUNT_ID', value: appConfig.r2AccountId },
    { name: 'R2_BUCKET_NAME', value: appConfig.r2BucketName },
    { name: 'R2_PUBLIC_URL', value: appConfig.r2PublicUrl },
    { name: 'R2_SECRET_ACCESS_KEY', value: appConfig.r2SecretAccessKey },
  ]);
}

export async function putR2Object(key, body, contentType) {
  requireR2Configured();

  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${appConfig.r2AccountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${appConfig.r2BucketName}/${encodeObjectKey(key)}`;
  const payloadHash = sha256(payload);
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(appConfig.r2SecretAccessKey, dateStamp), stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${appConfig.r2AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const endpoint = `https://${host}${canonicalUri}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      authorization,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare R2 upload failed: ${response.status} ${errorText}`);
  }

  return `${appConfig.r2PublicUrl.replace(/\/$/, '')}/${encodeObjectKey(key)}`;
}
