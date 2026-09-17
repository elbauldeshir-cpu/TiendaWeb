import { db, Category, Product } from 'astro:db';
import { persistCatalog, restoreCatalog } from '../src/lib/catalog-persistence';

/**
 * DATOS DE PRUEBA (no son datos reales de la empresa).
 * Nombres, precios e imágenes son ficticios y existen únicamente para
 * poder probar la aplicación en local. Los nombres llevan el prefijo
 * [DEMO] para distinguirlos del inventario real.
 */
export default async function seed() {
  if (await restoreCatalog()) {
    console.log('Catálogo restaurado desde data/catalog.json.');
    return;
  }

  const existingCategories = await db.select().from(Category);
  const existingProducts = await db.select().from(Product);

  if (existingCategories.length > 0 || existingProducts.length > 0) {
    console.log('Seed omitido: la base local ya contiene datos.');
    return;
  }

  await db.insert(Category).values([
    { id: 1, name: 'Maquillaje', slug: 'maquillaje', description: 'Labiales, rubores y bases.', isActive: true },
    { id: 2, name: 'Cuidado de la piel', slug: 'cuidado-de-la-piel', description: 'Limpieza, hidratación y protección.', isActive: true },
    { id: 3, name: 'Accesorios', slug: 'accesorios', description: 'Brochas, esponjas y organizadores.', isActive: true },
    { id: 4, name: 'Regalos', slug: 'regalos', description: 'Cajas y kits para ocasiones especiales.', isActive: true },
  ]);

  await db.insert(Product).values([
    {
      id: 1,
      name: '[DEMO] Labial mate larga duración',
      slug: 'demo-labial-mate-larga-duracion',
      description: 'Acabado mate con textura ligera. Dato de prueba.',
      priceCents: 3200000,
      imageUrl: '/demo/producto-labial.svg',
      imageAlt: 'Labial en tono rosado',
      categoryId: 1,
      isActive: true,
      inStock: true,
    },
    {
      id: 2,
      name: '[DEMO] Rubor en polvo',
      slug: 'demo-rubor-en-polvo',
      description: 'Pigmento suave para el día a día. Dato de prueba.',
      priceCents: 2800000,
      imageUrl: null,
      imageAlt: null,
      categoryId: 1,
      isActive: true,
      inStock: false,
    },
    {
      id: 3,
      name: '[DEMO] Serum hidratante',
      slug: 'demo-serum-hidratante',
      description: 'Hidratación ligera para rostro. Dato de prueba.',
      priceCents: 5400000,
      imageUrl: '/demo/producto-serum.svg',
      imageAlt: 'Frasco de serum con gotero',
      categoryId: 2,
      isActive: true,
      inStock: true,
    },
    {
      id: 4,
      name: '[DEMO] Protector solar facial',
      slug: 'demo-protector-solar-facial',
      description: 'Textura fluida, sin residuo blanco. Dato de prueba.',
      priceCents: 6200000,
      imageUrl: null,
      imageAlt: null,
      categoryId: 2,
      isActive: true,
      inStock: true,
    },
    {
      id: 5,
      name: '[DEMO] Set de brochas x5',
      slug: 'demo-set-de-brochas-x5',
      description: 'Cinco brochas con estuche. Dato de prueba.',
      priceCents: 4500000,
      imageUrl: '/demo/producto-brochas.svg',
      imageAlt: 'Juego de brochas de maquillaje',
      categoryId: 3,
      isActive: true,
      inStock: true,
    },
    {
      id: 6,
      name: '[DEMO] Caja sorpresa mediana',
      slug: 'demo-caja-sorpresa-mediana',
      description: 'Caja armada con cuatro productos a elección. Dato de prueba.',
      priceCents: 9500000,
      imageUrl: '/demo/producto-caja.svg',
      imageAlt: 'Caja de regalo decorada',
      categoryId: 4,
      isActive: true,
      inStock: true,
    },
    {
      id: 7,
      name: '[DEMO] Kit de viaje',
      slug: 'demo-kit-de-viaje',
      description: 'Producto oculto: sirve para probar el estado inactivo. Dato de prueba.',
      priceCents: 7300000,
      imageUrl: null,
      imageAlt: null,
      categoryId: 4,
      isActive: false,
      inStock: true,
    },
  ]);

  await persistCatalog();
  console.log('Seed completado: 4 categorías y 7 productos de prueba.');
}
