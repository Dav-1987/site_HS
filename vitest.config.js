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
    // scripts/ was missing here, so scripts/deploy-dist.test.js and
    // scripts/local-wallapop-store.test.js sat in the repo without ever being
    // run — including the checks on the paths the deploy will rm -rf.
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'server/**/*.{test,spec}.js',
      'scripts/**/*.{test,spec}.{js,mjs}',
    ],
  },
});
