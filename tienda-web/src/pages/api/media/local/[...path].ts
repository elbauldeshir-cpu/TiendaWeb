import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { APIRoute } from 'astro';

export const prerender = false;

const MEDIA_DIRECTORY = process.env.MEDIA_DIRECTORY
  ? path.resolve(process.env.MEDIA_DIRECTORY)
  : path.resolve(process.cwd(), '..', 'tienda-web-media');

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const GET: APIRoute = async ({ params }) => {
  const relativePath = params.path;
  if (!relativePath || relativePath.includes('..') || relativePath.includes('\\')) {
    return new Response('Ruta de imagen inválida.', { status: 400 });
  }

  const filePath = path.resolve(MEDIA_DIRECTORY, relativePath);
  if (!filePath.startsWith(`${MEDIA_DIRECTORY}${path.sep}`)) {
    return new Response('Ruta de imagen inválida.', { status: 400 });
  }

  try {
    const file = await readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Imagen no encontrada.', { status: 404 });
  }
};