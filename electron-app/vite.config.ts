import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
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