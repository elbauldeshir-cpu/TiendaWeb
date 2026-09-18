import { Category, Product, ProductImage, db, eq } from 'astro:db';

import { AppError } from '@/lib/errors';
import { persistCatalog } from '@/lib/catalog-persistence';
import { slugify } from '@/lib/format';
import { googleDriveFileId } from '@/lib/image-url';
import type { Product as ProductModel, ProductInput, ProductQuery } from '@/types/catalog';

type ProductRow = typeof Product.$inferSelect;
type CategoryRow = typeof Category.$inferSelect;

export const ALL_CATEGORIES = 'todos';

function toModel(row: ProductRow, categories: Map<number, CategoryRow>): ProductModel {
  const category = row.categoryId != null ? categories.get(row.categoryId) : undefined;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    priceCents: row.priceCents,
    imageUrl: row.imageUrl ?? null,
    imageAlt: row.imageAlt ?? null,
    categoryId: row.categoryId ?? null,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    isActive: row.isActive,
    inStock: row.inStock,
    images: [],
  };
}

async function imageIndex(): Promise<Map<number, ProductModel['images']>> {
  const rows = await db.select().from(ProductImage);
  const images = new Map<number, ProductModel['images']>();
  for (const row of rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
    const productImages = images.get(row.productId) ?? [];
    productImages.push({
      id: row.id,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt ?? null,
      sortOrder: row.sortOrder,
    });
    images.set(row.productId, productImages);
  }
  return images;
}

function addImages(product: ProductModel, images: Map<number, ProductModel['images']>): ProductModel {
  const storedImages = images.get(product.id) ?? [];
  const legacyImage = product.imageUrl
    ? [{ id: 0, imageUrl: product.imageUrl, imageAlt: product.imageAlt, sortOrder: -1 }]
    : [];
  return { ...product, images: [...legacyImage, ...storedImages] };
}

async function categoryIndex(): Promise<Map<number, CategoryRow>> {
  const rows = await db.select().from(Category);
  return new Map(rows.map((row) => [row.id, row]));
}

async function uniqueSlug(name: string, ignoreId?: number): Promise<string> {
  const base = slugify(name) || 'producto';
  const rows = await db.select().from(Product);
  const taken = new Set(rows.filter((row) => row.id !== ignoreId).map((row) => row.slug));

  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/**
 * Lista productos. La tienda pública usa `onlyActive: true`;
 * el panel administrativo lista todo.
 */
export async function listProducts(query: ProductQuery = {}): Promise<ProductModel[]> {
  const { categorySlug, onlyActive = false } = query;
  const [rows, categories, images] = await Promise.all([
    db.select().from(Product),
    categoryIndex(),
    imageIndex(),
  ]);

  const products = rows
    .map((row) => addImages(toModel(row, categories), images))
    .filter((product) => (onlyActive ? product.isActive : true))
    .filter((product) => {
      if (!categorySlug || categorySlug === ALL_CATEGORIES) return true;
      return product.categorySlug === categorySlug;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return products;
}

export async function getProductById(id: number): Promise<ProductModel | null> {
  const [rows, categories, images] = await Promise.all([
    db.select().from(Product).where(eq(Product.id, id)),
    categoryIndex(),
    imageIndex(),
  ]);
  const row = rows.at(0);
  return row ? addImages(toModel(row, categories), images) : null;
}

async function assertCategoryExists(categoryId: number | null): Promise<void> {
  if (categoryId === null) return;
  const rows = await db.select().from(Category).where(eq(Category.id, categoryId));
  if (rows.length === 0) {
    throw new AppError('La categoría seleccionada no existe.', { status: 422 });
  }
}

export async function createProduct(input: ProductInput): Promise<ProductModel> {
  await assertCategoryExists(input.categoryId);
  const imageUrl = input.imageUrl ? normalizeImageUrl(input.imageUrl) : null;
  if (input.imageUrl && !imageUrl) {
    throw new AppError('La URL principal de la imagen no es válida.', { status: 422 });
  }

  const now = new Date();
  const inserted = await db
    .insert(Product)
    .values({
      name: input.name,
      slug: await uniqueSlug(input.name),
      description: input.description,
      priceCents: input.priceCents,
      imageUrl,
      imageAlt: input.imageAlt,
      categoryId: input.categoryId,
      isActive: input.isActive,
      inStock: input.inStock,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted.at(0);
  if (!row) throw new AppError('No fue posible crear el producto.', { status: 500 });
  await persistCatalog();
  return toModel(row, await categoryIndex());
}

export async function updateProduct(id: number, input: ProductInput): Promise<ProductModel> {
  const existing = await getProductById(id);
  if (!existing) throw new AppError('No encontramos el producto.', { status: 404 });
  await assertCategoryExists(input.categoryId);
  const imageUrl = input.imageUrl ? normalizeImageUrl(input.imageUrl) : null;
  if (input.imageUrl && !imageUrl) {
    throw new AppError('La URL principal de la imagen no es válida.', { status: 422 });
  }

  const updated = await db
    .update(Product)
    .set({
      name: input.name,
      slug: await uniqueSlug(input.name, id),
      description: input.description,
      priceCents: input.priceCents,
      imageUrl,
      imageAlt: input.imageAlt,
      categoryId: input.categoryId,
      isActive: input.isActive,
      inStock: input.inStock,
      updatedAt: new Date(),
    })
    .where(eq(Product.id, id))
    .returning();

  const row = updated.at(0);
  if (!row) throw new AppError('No fue posible guardar el producto.', { status: 500 });
  await persistCatalog();
  return toModel(row, await categoryIndex());
}

export async function saveProductImages(
  productId: number,
  imageAlt: string | null,
  rawImageUrls = '',
  primaryImageUrl: string | null = null,
): Promise<void> {
  const rawUrls = rawImageUrls
    .split(/[\r\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const imageUrls = rawUrls.map(normalizeImageUrl);
  console.info('[products.images.received]', JSON.stringify({
    productId,
    rawUrlCount: rawUrls.length,
    normalizedUrlCount: imageUrls.filter(Boolean).length,
    primaryProvided: Boolean(primaryImageUrl),
  }));
  if (imageUrls.some((value) => !value)) {
    throw new AppError('Cada enlace de imagen debe ser una URL pública válida.', { status: 422 });
  }
  if (rawUrls.length > 8) throw new AppError('Puedes guardar máximo 8 imágenes por vez.', { status: 422 });

  const allImages = await db.select().from(ProductImage);
  const existingImages = await db.select().from(ProductImage).where(eq(ProductImage.productId, productId));
  const normalizedPrimaryUrl = primaryImageUrl ? normalizeImageUrl(primaryImageUrl) : null;
  const existingUrls = new Set(existingImages.map((image) => image.imageUrl));
  const urlsToSave = [...new Set(imageUrls)].filter(
    (imageUrl): imageUrl is string => Boolean(imageUrl) && imageUrl !== normalizedPrimaryUrl && !existingUrls.has(imageUrl),
  );
  console.info('[products.images.plan]', JSON.stringify({
    productId,
    existingImageCount: existingImages.length,
    totalImageCount: allImages.length,
    urlsToSaveCount: urlsToSave.length,
  }));
  if (urlsToSave.length === 0) return;
  const nextImageId = allImages.reduce((max, image) => Math.max(max, image.id), 0) + 1;
  const startingOrder = existingImages.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;

  for (const [index, imageUrl] of urlsToSave.entries()) {
    try {
      await db.insert(ProductImage).values({
        id: nextImageId + index,
        productId,
        imageUrl,
        imageAlt,
        sortOrder: startingOrder + index,
      });
      console.info('[products.images.inserted]', JSON.stringify({
        productId,
        imageId: nextImageId + index,
        sortOrder: startingOrder + index,
      }));
    } catch (error) {
      console.error('[products.images.insert-failed]', JSON.stringify({
        productId,
        imageId: nextImageId + index,
        imageUrlHost: (() => {
          try { return new URL(imageUrl).hostname; } catch { return 'invalid'; }
        })(),
        error: error instanceof Error ? { name: error.name, message: error.message, cause: error.cause } : error,
      }));
      throw new AppError('No fue posible guardar las imágenes del producto.', {
        status: 500,
        cause: error,
      });
    }
  }
  await persistCatalog();
}

function normalizeImageUrl(value: string): string {
  if (value.startsWith('/')) return value;
  try {
    const url = new URL(value);
    const fileId = googleDriveFileId(value);
    if (fileId) return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
    return /^https?:$/.test(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export async function setProductActive(id: number, isActive: boolean): Promise<void> {
  const existing = await getProductById(id);
  if (!existing) throw new AppError('No encontramos el producto.', { status: 404 });

  await db.update(Product).set({ isActive, updatedAt: new Date() }).where(eq(Product.id, id));
}

export async function deleteProduct(id: number): Promise<void> {
  const existing = await getProductById(id);
  if (!existing) throw new AppError('No encontramos el producto.', { status: 404 });

  await db.delete(ProductImage).where(eq(ProductImage.productId, id));
  await db.delete(Product).where(eq(Product.id, id));
  await persistCatalog();
}

export async function countProducts(): Promise<{ total: number; active: number; outOfStock: number }> {
  const rows = await db.select().from(Product);
  return {
    total: rows.length,
    active: rows.filter((row) => row.isActive).length,
    outOfStock: rows.filter((row) => !row.inStock).length,
  };
}
