import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // Force a single instance of the Firebase SDK modules so providers
    // registered by one copy are visible to the app created by another.
    dedupe: [
      'firebase',
      '@firebase/app',
      '@firebase/component',
      '@firebase/util',
      '@firebase/logger',
    ],
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          reports: ['jspdf', 'jspdf-autotable', 'xlsx'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});