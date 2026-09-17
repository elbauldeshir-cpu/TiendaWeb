export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** Precio en centavos. Formatear siempre con `formatPrice`. */
  priceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  isActive: boolean;
  inStock: boolean;
  images: ProductImage[];
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  imageAlt: string | null;
  sortOrder: number;
}

export interface ProductInput {
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  categoryId: number | null;
  isActive: boolean;
  inStock: boolean;
}

export interface ProductDraft {
  name: string;
  price: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imageUrls: string;
  isActive: boolean;
  inStock: boolean;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ProductQuery {
  /** Slug de categoría. `undefined` o 'todos' devuelve todo el catálogo. */
  categorySlug?: string;
  /** `true` (por defecto en la tienda) devuelve solo productos activos. */
  onlyActive?: boolean;
}
