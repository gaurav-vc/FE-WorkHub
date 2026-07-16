const isProd = import.meta.env.PROD;

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (isProd ? "https://workhub.vibesandbox.live/api" : "http://127.0.0.1:8000/api");
export const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE_URL ?? (isProd ? "https://workhub.vibesandbox.live" : "http://127.0.0.1:8000");
