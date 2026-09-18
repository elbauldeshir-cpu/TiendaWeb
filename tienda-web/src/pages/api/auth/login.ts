import type { APIRoute } from 'astro';

import { credentialsSchema } from '@/validations/catalog';
import { logError } from '@/lib/errors';
import { signIn } from '@/services/auth.service';

export const prerender = false;

/** Solo se permiten destinos internos, para evitar redirecciones abiertas. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/admin') ? next : '/admin';
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const next = safeNext(form.get('next'));

  const parsed = credentialsSchema.safeParse({
    email: form.get('email')?.toString() ?? '',
    password: form.get('password')?.toString() ?? '',
  });

  if (!parsed.success) {
    return redirect('/admin/ingresar?error=invalid-credentials', 303);
  }

  try {
    await signIn(parsed.data.email, parsed.data.password, cookies);
    return redirect(next, 303);
  } catch (error) {
    logError('auth.login', error);
    return redirect('/admin/ingresar?error=invalid-credentials', 303);
  }
};
