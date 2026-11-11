import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The SDK creates a worker relative to import.meta.url. Pre-bundling moves
  // that URL into .vite/deps without copying the worker, breaking video sending.
  optimizeDeps: {
    exclude: ['@decartai/sdk'],
    // Keep CommonJS dependencies browser-compatible without moving SDK assets.
    include: ['@decartai/sdk > p-retry'],
  },
  ...(mode === 'lan' ? {
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // A phone's localhost is the phone. Proxy API/media through the PC instead.
      proxy: {
        '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
        '/media': { target: 'http://127.0.0.1:4000', changeOrigin: false },
      },
    },
  } : {}),
}));
