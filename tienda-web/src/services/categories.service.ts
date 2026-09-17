import { Category, Product, db, eq } from 'astro:db';

import { AppError } from '@/lib/errors';
import { persistCatalog } from '@/lib/catalog-persistence';
import { slugify } from '@/lib/format';
import type { Category as CategoryModel, CategoryInput, CategoryWithCount } from '@/types/catalog';

type CategoryRow = typeof Category.$inferSelect;

function toModel(row: CategoryRow): CategoryModel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    isActive: row.isActive,
  };
}

function byName(a: CategoryModel, b: CategoryModel): number {
  return a.name.localeCompare(b.name, 'es');
}

/** Genera un slug único; si ya existe, agrega un sufijo numérico. */
async function uniqueSlug(name: string, ignoreId?: number): Promise<string> {
  const base = slugify(name) || 'categoria';
  const rows = await db.select().from(Category);
  const taken = new Set(rows.filter((row) => row.id !== ignoreId).map((row) => row.slug));

  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function listCategories(options: { onlyActive?: boolean } = {}): Promise<CategoryModel[]> {
  const rows = await db.select().from(Category);
  return rows
    .map(toModel)
    .filter((category) => (options.onlyActive ? category.isActive : true))
    .sort(byName);
}

/** Categorías con el número de productos asociados (para el panel). */
export async function listCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const [categoryRows, productRows] = await Promise.all([
    db.select().from(Category),
    db.select().from(Product),
  ]);

  return categoryRows
    .map((row) => ({
      ...toModel(row),
      productCount: productRows.filter((product) => product.categoryId === row.id).length,
    }))
    .sort(byName);
}

export async function getCategoryById(id: number): Promise<CategoryModel | null> {
  const rows = await db.select().from(Category).where(eq(Category.id, id));
  const row = rows.at(0);
  return row ? toModel(row) : null;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryModel | null> {
  const rows = await db.select().from(Category).where(eq(Category.slug, slug));
  const row = rows.at(0);
  return row ? toModel(row) : null;
}

export async function createCategory(input: CategoryInput): Promise<CategoryModel> {
  const rows = await db.select().from(Category);
  if (rows.some((row) => row.name.toLowerCase() === input.name.toLowerCase())) {
    throw new AppError('Ya existe una categoría con ese nombre.', { status: 409 });
  }

  const now = new Date();
  const inserted = await db
    .insert(Category)
    .values({
      name: input.name,
      slug: await uniqueSlug(input.name),
      description: input.description,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted.at(0);
  if (!row) throw new AppError('No fue posible crear la categoría.', { status: 500 });
  await persistCatalog();
  return toModel(row);
}

export async function updateCategory(id: number, input: CategoryInput): Promise<CategoryModel> {
  const existing = await getCategoryById(id);
  if (!existing) throw new AppError('No encontramos la categoría.', { status: 404 });

  const rows = await db.select().from(Category);
  const duplicated = rows.some(
    (row) => row.id !== id && row.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (duplicated) throw new AppError('Ya existe una categoría con ese nombre.', { status: 409 });

  const updated = await db
    .update(Category)
    .set({
      name: input.name,
      slug: await uniqueSlug(input.name, id),
      description: input.description,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(Category.id, id))
    .returning();

  const row = updated.at(0);
  if (!row) throw new AppError('No fue posible guardar la categoría.', { status: 500 });
  await persistCatalog();
  return toModel(row);
}

export async function setCategoryActive(id: number, isActive: boolean): Promise<void> {
  const existing = await getCategoryById(id);
  if (!existing) throw new AppError('No encontramos la categoría.', { status: 404 });

  await db
    .update(Category)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(Category.id, id));
  await persistCatalog();
}

/**
 * Elimina la categoría y desvincula sus productos (quedan "Sin categoría").
 * Así no se generan productos huérfanos apuntando a un id inexistente.
 */
export async function deleteCategory(id: number): Promise<void> {
  const existing = await getCategoryById(id);
  if (!existing) throw new AppError('No encontramos la categoría.', { status: 404 });

  await db
    .update(Product)
    .set({ categoryId: null, updatedAt: new Date() })
    .where(eq(Product.categoryId, id));

  await db.delete(Category).where(eq(Category.id, id));
  await persistCatalog();
}
