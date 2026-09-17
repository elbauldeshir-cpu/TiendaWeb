import { z } from 'zod';

import { parsePriceToCents } from '@/lib/format';

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value));

const checkbox = z
  .union([z.string(), z.undefined()])
  .transform((value) => value === 'on' || value === 'true');

const imageUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .refine(
    (value) => value === null || /^(https?:\/\/|\/)/.test(value),
    'La imagen debe ser una URL que empiece por http(s):// o una ruta interna que empiece por /.',
  );

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120),
  description: optionalText.pipe(z.string().max(600).nullable()),
  price: z
    .string()
    .trim()
    .min(1, 'Escribe el precio.')
    .transform(parsePriceToCents)
    .refine((cents) => Number.isFinite(cents) && cents > 0, 'El precio debe ser un número mayor que cero.'),
  imageUrl,
  imageUrls: z.string().trim().max(2000, 'Las URLs de imágenes son demasiado largas.'),
  imageAlt: optionalText.pipe(z.string().max(160).nullable()),
  categoryId: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number.parseInt(value, 10)))
    .refine(
      (value) => value === null || (Number.isInteger(value) && value > 0),
      'Selecciona una categoría válida.',
    ),
  isActive: checkbox,
  inStock: checkbox,
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(60),
  description: optionalText.pipe(z.string().max(300).nullable()),
  isActive: checkbox,
});

export const idSchema = z
  .string()
  .trim()
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => Number.isInteger(value) && value > 0, 'Identificador inválido.');

export const credentialsSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/** Convierte los errores de zod en un mapa campo → mensaje. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    result[key] ??= issue.message;
  }
  return result;
}
