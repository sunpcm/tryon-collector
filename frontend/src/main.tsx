import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { cluster } from '@/features/clustering/cluster';

// Expose cluster function for E2E performance testing (dev mode only)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__testCluster = cluster;
}

document.title = import.meta.env.VITE_APP_TITLE || 'Tryon Collector';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
