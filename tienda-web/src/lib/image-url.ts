const DRIVE_HOSTS = new Set(['drive.google.com', 'www.drive.google.com']);

export function googleDriveFileId(value: string): string | null {
  try {
    const url = new URL(value);
    if (!DRIVE_HOSTS.has(url.hostname)) return null;

    return url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1]
      ?? url.searchParams.get('id');
  } catch {
    return null;
  }
}

export function imageDisplayUrl(value: string): string {
  const fileId = googleDriveFileId(value);
  return fileId ? `/api/media/drive/${encodeURIComponent(fileId)}` : value;
}