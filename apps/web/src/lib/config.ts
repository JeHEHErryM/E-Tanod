export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const API_ORIGIN = new URL(API_BASE).origin;

/** Socket.IO connects to the API origin (root namespace), not the `/api` prefix. */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_ORIGIN;

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '';

/** Resolve an API-served static path (e.g. `/uploads/...`) to an absolute URL. */
export function uploadUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

/** Derived 480px thumbnail path for an attachment's full image URL. */
export function attachmentThumb(url: string): string {
  return uploadUrl(url.replace(/\.jpg$/, '-thumb.jpg'));
}
