import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Category, Product, ProductImage, db } from 'astro:db';

const snapshotPath = path.join(process.cwd(), 'data', 'catalog.json');

type Snapshot = {
  categories: Record<string, unknown>[];
  products: Record<string, unknown>[];
  images: Record<string, unknown>[];
};

function restoreDates(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      fields.includes(key) && typeof value === 'string' ? new Date(value) : value,
    ]),
  );
}

export async function persistCatalog(): Promise<void> {
  if (!process.env.ASTRO_DATABASE_FILE) return;

  const [categories, products, images] = await Promise.all([
    db.select().from(Category),
    db.select().from(Product),
    db.select().from(ProductImage),
  ]);
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(
    snapshotPath,
    `${JSON.stringify({ categories, products, images }, null, 2)}\n`,
    'utf8',
  );
}

export async function restoreCatalog(): Promise<boolean> {
  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot;
  } catch {
    return false;
  }

  if (!snapshot.categories.length && !snapshot.products.length) return false;

  if (snapshot.categories.length) {
    await db.insert(Category).values(
      snapshot.categories.map((row) => restoreDates(row, ['createdAt', 'updatedAt'])) as typeof Category.$inferInsert[],
    );
  }
  if (snapshot.products.length) {
    await db.insert(Product).values(
      snapshot.products.map((row) => restoreDates(row, ['createdAt', 'updatedAt'])) as typeof Product.$inferInsert[],
    );
  }
  if (snapshot.images.length) {
    await db.insert(ProductImage).values(
      snapshot.images.map((row) => restoreDates(row, ['createdAt'])) as typeof ProductImage.$inferInsert[],
    );
  }
  return true;
}
