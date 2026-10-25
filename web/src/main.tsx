import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled so the app works offline (FM-like Roboto + condensed headings).
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-condensed/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/app.css';
import { App } from './App.tsx';
import { initTheme } from './lib/theme.ts';

initTheme();

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
