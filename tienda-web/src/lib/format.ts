import { brand } from '@/config/site';

const priceFormatter = new Intl.NumberFormat(brand.locale, {
  style: 'currency',
  currency: brand.currency,
  maximumFractionDigits: 0,
});

/** Convierte centavos almacenados en la base a un precio legible. */
export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / 100);
}

/** Convierte un precio escrito por el administrador (ej. "18.500") a centavos. */
export function parsePriceToCents(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return Number.NaN;
  return Math.round(amount * 100);
}

/** Valor para prellenar inputs de precio en el panel. */
export function centsToInputValue(priceCents: number): string {
  return (priceCents / 100).toFixed(0);
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(brand.locale, { dateStyle: 'medium' }).format(value);
}
