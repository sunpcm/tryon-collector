// API base URL from environment
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// App title from environment
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Code JS Template';

// Development mode check
export const isDevelopment = import.meta.env.DEV;

// Production mode check
export const isProduction = import.meta.env.PROD;
