import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force dark theme
document.documentElement.classList.add('dark');
document.body.style.backgroundColor = '#0f0f14';
document.body.style.color = '#e2e4e9';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
