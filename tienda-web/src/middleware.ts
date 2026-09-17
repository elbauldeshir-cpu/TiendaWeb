import { defineMiddleware } from 'astro:middleware';

import { getSession } from '@/services/auth.service';

const LOGIN_PATH = '/admin/ingresar';

/** Rutas administrativas accesibles sin sesión. */
const PUBLIC_ADMIN_PATHS = new Set([LOGIN_PATH, '/api/auth/login', '/api/auth/logout']);

function isProtected(pathname: string): boolean {
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return false;
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const session = getSession(context.cookies);
  context.locals.admin = session;

  if (!isProtected(context.url.pathname)) {
    return next();
  }

  if (!session) {
    if (context.url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ message: 'No autorizado.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const redirectTo = `${LOGIN_PATH}?error=auth-required&next=${encodeURIComponent(context.url.pathname)}`;
    return context.redirect(redirectTo, 302);
  }

  return next();
});
