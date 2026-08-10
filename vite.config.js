import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localWallapopStore } from './scripts/local-wallapop-store.mjs';

// Dev server runs on :3000 (matches the screenshot workflow, screenshot.mjs).
// `/api` and `/uploads` are proxied to the VPS backend.
// Production builds use vite.config.vps.js (see DEPLOY.md).
export default defineConfig({
  plugins: [react(), localWallapopStore()],
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: true,
    proxy: {
      '/api': { target: 'http://185.202.172.59', changeOrigin: true },
      '/uploads': { target: 'http://185.202.172.59', changeOrigin: true },
    },
  },
});
