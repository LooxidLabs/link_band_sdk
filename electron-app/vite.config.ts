import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // 환경 변수를 빌드 시에 정적으로 대체
    'import.meta.env.VITE_LINK_ENGINE_SERVER_URL': JSON.stringify('http://127.0.0.1:8121'),
    'import.meta.env.VITE_LINK_CLOUD_SERVER_URL': JSON.stringify('http://127.0.0.1:8121'),
    'import.meta.env.VITE_WEBSOCKET_URL': JSON.stringify('ws://127.0.0.1:18765'),
  },
  resolve: {
    alias: {
      '@mui/styled-engine': '@mui/styled-engine-sc',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      external: [
        'electron-store',
        'electron',
        'node:fs',
        'node:path',
        'node:process',
        'node:util',
        'node:os',
        'node:crypto',
        'node:assert',
      ],
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})