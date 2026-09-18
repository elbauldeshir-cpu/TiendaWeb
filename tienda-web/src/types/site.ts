export interface ContactInfo {
  businessName: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  address: string;
  city: string;
}

export interface PaymentMethod {
  id: string;
  icon: string;
  name: string;
  /** Explicación corta para el comprador. */
  summary: string;
  /** Datos concretos (cuenta, titular). Se cargan por configuración. */
  details: string;
  enabled: boolean;
}

export interface AdminSession {
  email: string;
  expiresAt: number;
}
