import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-electron-plugin';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      include: ['electron']
    })
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  envPrefix: 'VITE_'
}); 