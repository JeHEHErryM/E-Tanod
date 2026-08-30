export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_BASE;

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '';
