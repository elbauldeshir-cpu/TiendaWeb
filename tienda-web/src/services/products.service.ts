import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
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

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function saveProductImages(
  productId: number,
  files: File[],
  imageAlt: string | null,
  rawImageUrls = '',
  primaryImageUrl: string | null = null,
): Promise<void> {
  const validFiles = files.filter((file) => file.size > 0);
  const rawUrls = rawImageUrls
    .split(/[\r\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const imageUrls = rawUrls.map(normalizeImageUrl);
  if (imageUrls.some((value) => !value)) {
    throw new AppError('Cada enlace de imagen debe ser una URL pública válida.', { status: 422 });
  }
  if (validFiles.some((file) => !IMAGE_EXTENSIONS[file.type] || file.size > 8 * 1024 * 1024)) {
    throw new AppError('Cada imagen debe ser JPG, PNG, WEBP o GIF y pesar máximo 8 MB.', { status: 422 });
  }

  const mediaDirectory = process.env.MEDIA_DIRECTORY
    ? path.resolve(process.env.MEDIA_DIRECTORY)
    : path.resolve(process.cwd(), '..', 'tienda-web-media');
  const directory = path.join(mediaDirectory, String(productId));
  const existingImages = await db.select().from(ProductImage).where(eq(ProductImage.productId, productId));
  const normalizedPrimaryUrl = primaryImageUrl ? normalizeImageUrl(primaryImageUrl) : null;
  const existingUrls = new Set(existingImages.map((image) => image.imageUrl));
  const urlsToSave = [...new Set(imageUrls)].filter(
    (imageUrl): imageUrl is string => Boolean(imageUrl) && imageUrl !== normalizedPrimaryUrl && !existingUrls.has(imageUrl),
  );
  if (validFiles.length + urlsToSave.length === 0) return;
  if (validFiles.length + urlsToSave.length > 8) {
    throw new AppError('Puedes cargar máximo 8 imágenes por vez.', { status: 422 });
  }
  if (validFiles.length > 0) {
    await mkdir(directory, { recursive: true });
  }
  const startingOrder = existingImages.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;

  if (urlsToSave.length > 0) {
    await db.insert(ProductImage).values(
      urlsToSave.map((imageUrl, index) => ({
        productId,
        imageUrl,
        imageAlt,
        sortOrder: startingOrder + index,
      })),
    );
  }

  const fileStartingOrder = startingOrder + urlsToSave.length;
  for (const [index, file] of validFiles.entries()) {
    const fileName = `producto-${productId}-${randomUUID()}${IMAGE_EXTENSIONS[file.type]}`;
    const imageUrl = `/api/media/local/${productId}/${fileName}`;
    await writeFile(path.join(directory, fileName), new Uint8Array(await file.arrayBuffer()));
    await db.insert(ProductImage).values({
      productId,
      imageUrl,
      imageAlt,
      sortOrder: fileStartingOrder + index,
    });
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

  const images = await db.select().from(ProductImage).where(eq(ProductImage.productId, id));
  for (const image of images) {
    if (image.imageUrl.startsWith('/productos/')) {
      await unlink(path.join(process.cwd(), 'public', image.imageUrl.slice(1))).catch(() => undefined);
    } else if (image.imageUrl.startsWith('/api/media/local/')) {
      const mediaDirectory = process.env.MEDIA_DIRECTORY
        ? path.resolve(process.env.MEDIA_DIRECTORY)
        : path.resolve(process.cwd(), '..', 'tienda-web-media');
      const relativePath = image.imageUrl.slice('/api/media/local/'.length);
      const filePath = path.resolve(mediaDirectory, relativePath);
      if (filePath.startsWith(`${mediaDirectory}${path.sep}`)) {
        await unlink(filePath).catch(() => undefined);
      }
    }
  }
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
