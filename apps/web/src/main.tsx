import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';

// Restore theme before first paint (avoid light/dark flash)
const savedTheme = localStorage.getItem('sb_theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark =
  savedTheme === 'dark' || (!savedTheme && prefersDark);
if (isDark) {
  document.documentElement.classList.add('dark');
}
document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
