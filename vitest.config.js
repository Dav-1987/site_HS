import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Test config kept separate from vite.config.js (dev) / vite.config.vps.js (build).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}', 'server/**/*.{test,spec}.js'],
  },
});
