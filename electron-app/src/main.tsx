import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force dark theme
document.documentElement.classList.add('dark');
document.body.style.backgroundColor = '#0f0f14';
document.body.style.color = '#e2e4e9';

// StrictMode는 프로덕션에서만 활성화 (중복 초기화 방지)
const isDev = import.meta.env.DEV;

createRoot(document.getElementById('root')!).render(
  isDev ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  ),
)
