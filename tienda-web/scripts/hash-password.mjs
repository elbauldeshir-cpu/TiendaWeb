#!/usr/bin/env node
/**
 * Genera el valor de ADMIN_PASSWORD_HASH.
 *
 *   npm run auth:hash -- "MiContraseñaSegura"
 *
 * El formato es <salt-hex>:<hash-hex> y debe coincidir con
 * src/lib/auth.ts (scrypt, 64 bytes). La contraseña nunca se guarda.
 */
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run auth:hash -- "TuContraseña"');
  process.exit(1);
}

if (password.length < 10) {
  console.error('Usa una contraseña de al menos 10 caracteres.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const derived = await scrypt(password, salt, KEY_LENGTH);

console.log('\nCopia esta línea en tu archivo .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${salt}:${derived.toString('hex')}\n`);
