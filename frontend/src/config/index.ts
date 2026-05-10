// API base URL — empty string means use relative paths (Vite proxy handles routing)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// API mode: 'live' (default) or 'e2e' (mock backend, no disk writes)
export const API_MODE = import.meta.env.VITE_API_MODE || 'live';

export const isE2eMode = API_MODE === 'e2e';

// App title from environment
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Tryon Collector';

// Development mode check
export const isDevelopment = import.meta.env.DEV;

// Production mode check
export const isProduction = import.meta.env.PROD;
