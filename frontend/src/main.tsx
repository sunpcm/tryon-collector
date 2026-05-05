import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'animal-island-ui/style';
import './index.css';
import App from './App.tsx';

document.title = import.meta.env.VITE_APP_TITLE || 'Tryon Collector';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
