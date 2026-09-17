import type { APIRoute } from 'astro';

import { AppError, logError } from '@/lib/errors';
import { categoryFormSchema, idSchema } from '@/validations/catalog';
import {
  createCategory,
  deleteCategory,
  setCategoryActive,
  updateCategory,
} from '@/services/categories.service';
import { withFlash } from '@/lib/flash';
import type { ErrorCode, SuccessCode } from '@/lib/flash';

export const prerender = false;

const LIST_PATH = '/admin/categorias';

function readCategoryInput(form: FormData) {
  return categoryFormSchema.safeParse({
    name: form.get('name')?.toString() ?? '',
    description: form.get('description')?.toString() ?? '',
    isActive: form.get('isActive')?.toString(),
  });
}

function errorCodeFor(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    if (error.status === 404) return 'not-found';
    if (error.status === 409) return 'duplicate-category';
    if (error.status === 422) return 'invalid-category';
  }
  return 'unknown';
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const intent = form.get('intent')?.toString() ?? '';

  try {
    switch (intent) {
      case 'create': {
        const parsed = readCategoryInput(form);
        if (!parsed.success) {
          return redirect(withFlash(LIST_PATH, { error: 'invalid-category' }), 303);
        }
        await createCategory(parsed.data);
        return redirect(withFlash(LIST_PATH, { ok: 'category-created' }), 303);
      }

      case 'update': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        const parsed = readCategoryInput(form);
        if (!parsed.success) {
          return redirect(
            withFlash(`${LIST_PATH}/${id.data}/editar`, { error: 'invalid-category' }),
            303,
          );
        }
        await updateCategory(id.data, parsed.data);
        return redirect(withFlash(LIST_PATH, { ok: 'category-updated' }), 303);
      }

      case 'toggle': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        const isActive = form.get('isActive')?.toString() === 'true';
        await setCategoryActive(id.data, isActive);
        const ok: SuccessCode = isActive ? 'category-activated' : 'category-deactivated';
        return redirect(withFlash(LIST_PATH, { ok }), 303);
      }

      case 'delete': {
        const id = idSchema.safeParse(form.get('id')?.toString() ?? '');
        if (!id.success) return redirect(withFlash(LIST_PATH, { error: 'not-found' }), 303);

        await deleteCategory(id.data);
        return redirect(withFlash(LIST_PATH, { ok: 'category-deleted' }), 303);
      }

      default:
        return redirect(withFlash(LIST_PATH, { error: 'unknown' }), 303);
    }
  } catch (error) {
    logError(`admin.categories.${intent}`, error);
    return redirect(withFlash(LIST_PATH, { error: errorCodeFor(error) }), 303);
  }
};
