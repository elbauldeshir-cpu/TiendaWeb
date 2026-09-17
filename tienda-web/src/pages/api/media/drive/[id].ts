import type { APIRoute } from 'astro';

export const prerender = false;

const DRIVE_DOWNLOAD_URL = 'https://drive.usercontent.google.com/download';

export const GET: APIRoute = async ({ params }) => {
  const fileId = params.id;
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response('Identificador de imagen inválido.', { status: 400 });
  }

  const response = await fetch(
    `${DRIVE_DOWNLOAD_URL}?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
    { redirect: 'follow' },
  );
  if (!response.ok) {
    return new Response('No se pudo cargar la imagen de Google Drive.', { status: 404 });
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return new Response('El archivo de Google Drive no es una imagen pública.', { status: 415 });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};