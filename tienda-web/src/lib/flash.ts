/**
 * Feedback entre redirecciones. Se viaja por querystring con un código,
 * nunca con texto libre, para evitar inyección de contenido en la vista.
 */
export const SUCCESS_MESSAGES = {
  'product-created': 'El producto se creó correctamente.',
  'product-updated': 'Los cambios del producto se guardaron.',
  'product-deleted': 'El producto se eliminó.',
  'product-activated': 'El producto ahora es visible en la tienda.',
  'product-deactivated': 'El producto se ocultó de la tienda.',
  'category-created': 'La categoría se creó correctamente.',
  'category-updated': 'Los cambios de la categoría se guardaron.',
  'category-deleted': 'La categoría se eliminó. Sus productos quedaron sin categoría.',
  'category-deactivated': 'La categoría se ocultó de la tienda.',
  'category-activated': 'La categoría vuelve a estar visible.',
  'signed-out': 'Cerraste la sesión.',
} as const;

export const ERROR_MESSAGES = {
  'invalid-credentials': 'El correo o la contraseña no coinciden.',
  'invalid-product': 'Revisa los datos del producto: hay campos incompletos o inválidos.',
  'invalid-category': 'Revisa los datos de la categoría: hay campos incompletos o inválidos.',
  'duplicate-product': 'Ya existe un producto con ese nombre.',
  'duplicate-category': 'Ya existe una categoría con ese nombre.',
  'not-found': 'No encontramos el registro que intentas modificar.',
  'session-expired': 'Tu sesión expiró. Ingresa de nuevo.',
  'auth-required': 'Ingresa con tu cuenta para administrar la tienda.',
  unknown: 'No fue posible completar la operación. Inténtalo nuevamente.',
} as const;

export type SuccessCode = keyof typeof SUCCESS_MESSAGES;
export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function successMessage(code: string | null): string | null {
  if (!code) return null;
  return SUCCESS_MESSAGES[code as SuccessCode] ?? null;
}

export function errorMessage(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code as ErrorCode] ?? ERROR_MESSAGES.unknown;
}

export function withFlash(path: string, params: { ok?: SuccessCode; error?: ErrorCode }): string {
  const url = new URL(path, 'http://local');
  if (params.ok) url.searchParams.set('ok', params.ok);
  if (params.error) url.searchParams.set('error', params.error);
  return `${url.pathname}${url.search}`;
}
