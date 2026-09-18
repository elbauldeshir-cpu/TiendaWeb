import type { APIRoute } from 'astro';

import { AppError, logError } from '@/lib/errors';
import { fieldErrorsFrom, idSchema, productFormSchema } from '@/validations/catalog';
import {
  createProduct,
  deleteProduct,
  saveProductImages,
  setProductActive,
  updateProduct,
} from '@/services/products.service';
import { withFlash } from '@/lib/flash';
import type { ErrorCode, SuccessCode } from '@/lib/flash';

export const prerender = false;

const LIST_PATH = '/admin/productos';

function readProductInput(form: FormData) {
  return productFormSchema.safeParse({
    name: form.get('name')?.toString() ?? '',
    description: form.get('description')?.toString() ?? '',
    price: form.get('price')?.toString() ?? '',
    imageUrl: form.get('imageUrl')?.toString() ?? '',
    imageUrls: form.get('imageUrls')?.toString() ?? '',
    imageAlt: form.get('imageAlt')?.toString() ?? '',
    categoryId: form.get('categoryId')?.toString() ?? '',
    isActive: form.get('isActive')?.toString(),
    inStock: form.get('inStock')?.toString(),
  });
}

function invalidProductRedirect(path: string, form: FormData, details: Record<string, string>): string {
  const url = new URL(withFlash(path, { error: 'invalid-product' }), 'http://local');
  url.searchParams.set('draft', '1');
  url.searchParams.set('details', Object.entries(details).map(([field, message]) => `${field}: ${message}`).join(' | '));

  for (const field of ['name', 'price', 'categoryId', 'description', 'imageUrl', 'imageUrls', 'imageAlt']) {
    url.searchParams.set(field, form.get(field)?.toString() ?? '');
  }
  url.searchParams.set('isActive', String(form.has('isActive')));
  url.searchParams.set('inStock', String(form.has('inStock')));

  return `${url.pathname}${url.search}`;
}

function toInput(values: ReturnType<typeof productFormSchema.parse>) {
  return {
    name: values.name,
    description: values.description,
    priceCents: values.price,
    imageUrl: values.imageUrl,
    imageAlt: values.imageAlt,
    categoryId: values.categoryId,
    isActive: values.isActive,
    inStock: values.inStock,
  };
}

function errorCodeFor(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    if (error.status === 404) return 'not-found';
    if (error.status === 409) return 'duplicate-product';
    if (error.status === 422) return 'invalid-product';
  }
  return 'unknown';
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const intent = form.get('intent')?.toString() ?? '';
  console.info('[api.admin.products.request]', JSON.stringify({
    intent,
    fields: Array.from(form.keys()),
    imageUrlsLength: form.get('imageUrls')?.toString().length ?? 0,
    imageUrlsCount: (form.get('imageUrls')?.toString() ?? '').split(/[\r\n,;]+/).filter((value) => value.trim()).length,
  }));

  try {
    switch (intent) {
      case 'create': {
        const parsed = readProductInput(form);
        if (!parsed.success) {
          const details = fieldErrorsFrom(parsed.error);
          logError('admin.products.create.validation', {
            fields: Array.from(form.keys()),
            errors: details,
          });
          return redirect(invalidProductRedirect(`${LIST_PATH}/nuevo`, form, details), 303);
        }
        const product = await createProduct(toInput(parsed.data));
        await saveProductImages(
          product.id,
          parsed.data.imageAlt,
          parsed.data.imageUrls,
          parsed.data.imageUrl,
        );
        return redirect(withFlash(LIST_PATH, { ok: 'product-created' }), 303);
      }

      case 'update': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        const parsed = readProductInput(form);
        if (!parsed.success) {
          const details = fieldErrorsFrom(parsed.error);
          logError('admin.products.update.validation', {
            fields: Array.from(form.keys()),
            errors: details,
          });
          return redirect(invalidProductRedirect(`${LIST_PATH}/${id.data}/editar`, form, details), 303);
        }
        const product = await updateProduct(id.data, toInput(parsed.data));
        await saveProductImages(
          product.id,
          parsed.data.imageAlt,
          parsed.data.imageUrls,
          parsed.data.imageUrl,
        );
        return redirect(withFlash(LIST_PATH, { ok: 'product-updated' }), 303);
      }

      case 'toggle': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        const isActive = form.get('isActive')?.toString() === 'true';
        await setProductActive(id.data, isActive);
        const ok: SuccessCode = isActive ? 'product-activated' : 'product-deactivated';
        return redirect(withFlash(LIST_PATH, { ok }), 303);
      }

      case 'delete': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        await deleteProduct(id.data);
        return redirect(withFlash(LIST_PATH, { ok: 'product-deleted' }), 303);
      }

      default:
        return redirect(withFlash(LIST_PATH, { error: 'unknown' }), 303);
    }
  } catch (error) {
    logError(`admin.products.${intent}`, {
      error,
      hasPrimaryImageUrl: Boolean(form.get('imageUrl')?.toString().trim()),
      additionalImageUrlCount: (form.get('imageUrls')?.toString() ?? '')
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean).length,
    });
    return redirect(withFlash(LIST_PATH, { error: errorCodeFor(error) }), 303);
  }
};
