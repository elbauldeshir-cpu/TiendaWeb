import { defineDb, defineTable, column, NOW } from 'astro:db';

/**
 * Categoría de productos. `isActive` permite desactivar una categoría
 * sin perder la relación con los productos asociados.
 */
const Category = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text({ unique: true }),
    description: column.text({ optional: true }),
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Producto de la tienda.
 * El precio se almacena en centavos (entero) para evitar errores de redondeo.
 * `categoryId` es opcional: al eliminar una categoría los productos quedan
 * "sin categoría" en lugar de romper la aplicación.
 */
const Product = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text({ unique: true }),
    description: column.text({ optional: true }),
    priceCents: column.number(),
    imageUrl: column.text({ optional: true }),
    imageAlt: column.text({ optional: true }),
    categoryId: column.number({
      optional: true,
      references: () => Category.columns.id,
    }),
    isActive: column.boolean({ default: true }),
    inStock: column.boolean({ default: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

const ProductImage = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    productId: column.number({ references: () => Product.columns.id }),
    imageUrl: column.text(),
    imageAlt: column.text({ optional: true }),
    sortOrder: column.number({ default: 0 }),
    createdAt: column.date({ default: NOW }),
  },
});

export default defineDb({
  tables: { Category, Product, ProductImage },
});
