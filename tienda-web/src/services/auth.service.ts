import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD_HASH,
  AUTH_SECRET,
  SESSION_TTL_HOURS,
} from 'astro:env/server';
import type { AstroCookies } from 'astro';

import { AppError } from '@/lib/errors';
import {
  SESSION_COOKIE,
  createSessionToken,
  emailsMatch,
  verifyPassword,
  verifySessionToken,
} from '@/lib/auth';
import type { AdminSession } from '@/types/site';

const ttlHours = SESSION_TTL_HOURS ?? 12;

/**
 * Valida credenciales contra las variables de entorno y emite la cookie
 * de sesión. Un solo administrador es suficiente hoy; cuando se necesiten
 * varios usuarios, este servicio es el único punto a cambiar.
 */
export async function signIn(
  email: string,
  password: string,
  cookies: AstroCookies,
): Promise<AdminSession> {
  const emailOk = emailsMatch(email, ADMIN_EMAIL);
  const passwordOk = await verifyPassword(password, ADMIN_PASSWORD_HASH);

  if (!emailOk || !passwordOk) {
    throw new AppError('El correo o la contraseña no coinciden.', { status: 401 });
  }

  const token = createSessionToken(ADMIN_EMAIL, AUTH_SECRET, ttlHours);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: ttlHours * 60 * 60,
  });

  return { email: ADMIN_EMAIL, expiresAt: Date.now() + ttlHours * 60 * 60 * 1000 };
}

export function signOut(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSession(cookies: AstroCookies): AdminSession | null {
  return verifySessionToken(cookies.get(SESSION_COOKIE)?.value, AUTH_SECRET);
}
