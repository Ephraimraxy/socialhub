import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { appConfig } from './config.js';
import { publicUser, readStore } from './store.js';

const tokenTtlMs = 1000 * 60 * 60 * 24 * 7;

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromBase64Url(input) {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
  return Buffer.from(padded.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8');
}

function sign(value) {
  return createHmac('sha256', appConfig.authSecret).update(value).digest('base64url');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createToken(user) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      exp: Date.now() + tokenTtlMs,
    }),
  );
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || token.split('.').length !== 3) return null;
  const [header, payload, signature] = token.split('.');
  const expected = sign(`${header}.${payload}`);
  if (signature !== expected) return null;

  const parsed = JSON.parse(fromBase64Url(payload));
  if (!parsed.exp || parsed.exp < Date.now()) return null;

  const data = readStore();
  const user = data.users.find((item) => item.id === parsed.sub);
  return user ? publicUser(user) : null;
}

export function getBearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

export function requireUser(request) {
  const user = verifyToken(getBearerToken(request));
  if (!user) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return user;
}
