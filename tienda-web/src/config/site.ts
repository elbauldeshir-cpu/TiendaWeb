import {
  PUBLIC_CONTACT_ADDRESS,
  PUBLIC_CONTACT_CITY,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_INSTAGRAM,
  PUBLIC_CONTACT_PHONE,
  PUBLIC_CONTACT_WHATSAPP,
} from 'astro:env/client';

import type { ContactInfo, PaymentMethod } from '@/types/site';

/**
 * Único lugar donde vive la identidad de la marca.
 * Los componentes leen de aquí; no repiten textos ni colores.
 */
export const brand = {
  name: 'El Baúl de Shir',
  tagline: 'Belleza y detalles',
  description:
    'Maquillaje, cuidado personal y detalles escogidos uno a uno. Escríbenos y armamos juntas tu pedido.',
  logo: {
    /** Lockup completo (baúl + nombre) sobre fondo transparente. */
    src: '/logo.png',
    alt: 'El Baúl de Shir',
    width: 677,
    height: 369,
    /** Solo el baúl, para espacios pequeños y cuadrados. */
    emblem: '/emblema.png',
    emblemAlt: 'Baúl abierto con productos de belleza',
  },
  locale: 'es-CO',
  currency: 'COP',
} as const;

/**
 * Paleta de marca. Se replica como tokens de Tailwind en src/styles/global.css.
 * Este objeto existe para usos programáticos (temas, correos, exportaciones).
 */
export const palette = {
  bubblegum: '#E75480',
  blush: '#F4C2C2',
  rose: '#D87093',
  wine: '#6B1D38',
  ink: '#2B1B17',
  cream: '#FFF5F5',
} as const;

/**
 * Datos de contacto. Se toman de variables de entorno para no dejar
 * información real dentro del código. Los campos vacíos no se muestran.
 * Paso siguiente previsto: mover estos valores a una tabla `Settings`
 * administrable desde el panel (ver README, "Decisiones arquitectónicas").
 */
export const contact: ContactInfo = {
  businessName: brand.name,
  phone: PUBLIC_CONTACT_PHONE,
  whatsapp: PUBLIC_CONTACT_WHATSAPP,
  email: PUBLIC_CONTACT_EMAIL,
  instagram: PUBLIC_CONTACT_INSTAGRAM,
  address: PUBLIC_CONTACT_ADDRESS,
  city: PUBLIC_CONTACT_CITY,
};

/**
 * Formas de pago visibles en la tienda. Estos datos se muestran al comprador
 * para que pueda elegir el medio y enviar el comprobante.
 */
export const paymentMethods: PaymentMethod[] = [
  {
    id: 'transferencia',
    icon: 'bank',
    name: 'Llave Bancolombia',
    summary: 'Envía el pago usando la llave Bancolombia y comparte el comprobante por WhatsApp.',
    details: 'Llave: 43259477 · Shirley Johanna Gil · CC 43.259.477',
    enabled: true,
  },
  {
    id: 'nequi',
    icon: 'wallet',
    name: 'Nequi',
    summary: 'Pago desde la app a nuestro número registrado.',
    details: 'Número: 3127936446 · Shirley Gil · CC 43.259.477',
    enabled: true,
  },
  {
    id: 'bancolombia',
    icon: 'building',
    name: 'Cuenta de ahorros Bancolombia',
    summary: 'Transferencia o consignación a cuenta de ahorros.',
    details: 'Cuenta: 34738014776 · Shirley Johanna Gil Hoyos · CC 43.259.477',
    enabled: true,
  },
  {
    id: 'efectivo',
    icon: 'cash',
    name: 'Efectivo',
    summary: 'Disponible en entregas presenciales acordadas previamente.',
    details: '',
    enabled: true,
  },
];

export const navigation = [
  { label: 'Tienda', href: '/' },
  { label: 'Formas de pago', href: '/formas-de-pago' },
  { label: 'Contacto', href: '/contacto' },
] as const;
