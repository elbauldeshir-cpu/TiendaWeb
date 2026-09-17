import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type { AdminSession } from '@/types/site';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'shir_session';

/** Genera `<salt>:<hash>` para guardar en ADMIN_PASSWORD_HASH. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== derived.length) return false;

  return timingSafeEqual(derived, expected);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Token de sesión firmado (HMAC-SHA256). No contiene datos sensibles. */
export function createSessionToken(email: string, secret: string, ttlHours: number): string {
  const session: AdminSession = {
    email,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string): AdminSession | null {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(received, expectedBuffer)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AdminSession;
    if (typeof session.email !== 'string' || typeof session.expiresAt !== 'number') return null;
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Comparación de correos resistente a diferencias de mayúsculas y espacios. */
export function emailsMatch(input: string, expected: string): boolean {
  return input.trim().toLowerCase() === expected.trim().toLowerCase();
}
