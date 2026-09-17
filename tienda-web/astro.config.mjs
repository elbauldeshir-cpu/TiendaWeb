// @ts-check
import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// El adaptador de Netlify solo hace falta al construir. En `astro dev` levanta
// un servidor de Edge Functions sobre Deno que no aporta nada en local.
const isBuild = process.argv.includes('build');

export default defineConfig({
  output: 'server',
  adapter: isBuild ? netlify() : undefined,
  integrations: [db()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      // --- Acceso administrativo (secretos, solo servidor) ---
      ADMIN_EMAIL: envField.string({ context: 'server', access: 'secret' }),
      ADMIN_PASSWORD_HASH: envField.string({ context: 'server', access: 'secret' }),
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      SESSION_TTL_HOURS: envField.number({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 12,
      }),

      // --- Datos de contacto (públicos, configurables por entorno) ---
      PUBLIC_CONTACT_PHONE: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONTACT_WHATSAPP: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONTACT_EMAIL: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONTACT_INSTAGRAM: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONTACT_ADDRESS: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONTACT_CITY: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
    },
  },
});
