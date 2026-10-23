import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Use import.meta.dirname (Node 21+) with fallback for older Node
const __dir = import.meta.dirname ?? new URL('.', import.meta.url).pathname.replace(/\/$/, '');

export default defineConfig({
  plugins: [react()],
  root: resolve(__dir, 'frontend'),
  build: {
    outDir: resolve(__dir, 'dist'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
