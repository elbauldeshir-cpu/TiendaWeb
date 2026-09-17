/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Sesión del administrador, o `null` para visitantes. */
    admin: import('@/types/site').AdminSession | null;
  }
}
