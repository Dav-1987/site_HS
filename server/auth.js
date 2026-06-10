// Lightweight admin auth — port of netlify/functions/_shared/auth.mts
// Replaced Netlify.env.get() → process.env
// Replaced req.headers.get() → req.headers[] (Express style)

import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'hs_admin';
const DEFAULT_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET is not configured');
  return s;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64) {
  return createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string' || input.length === 0) return false;
  return safeEqual(input, expected);
}

export function createSessionToken(maxAgeS = DEFAULT_MAX_AGE_S) {
  const payload = { exp: Date.now() + maxAgeS * 1000 };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function sessionCookie(token, maxAgeS = DEFAULT_MAX_AGE_S) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeS}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export function isAuthenticated(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const payloadB64 = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  try {
    if (!safeEqual(mac, sign(payloadB64))) return false;
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}
