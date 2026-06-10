import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server runs on :3000 (matches the screenshot workflow, screenshot.mjs).
// `/api` and `/uploads` are proxied to the local Express backend
// (server/index.js on :4000) — the same split as production, where Nginx
// proxies those paths to Express. To exercise the live API + /admin locally,
// run the backend alongside: `node server/index.js`.
// Production builds use vite.config.vps.js (see DEPLOY.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
