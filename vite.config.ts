import { defineConfig } from 'vite';

// Relative base so the built site works from any sub-path
// (e.g. apps.charliekrug.com/jacobian-playground).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
