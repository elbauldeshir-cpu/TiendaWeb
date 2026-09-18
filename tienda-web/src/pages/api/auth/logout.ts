import type { APIRoute } from 'astro';

import { signOut } from '@/services/auth.service';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  signOut(cookies);
  return redirect('/admin/ingresar?ok=signed-out', 303);
};
