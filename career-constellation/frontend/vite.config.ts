import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
  // Allow importing JSON files as modules
  json: {
    stringify: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
    port: 3000,
  },
  // Build configuration for Cloudflare Pages
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    // Ensure assets are properly hashed for caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          charts: ['recharts', 'd3'],
          ui: ['framer-motion', 'lucide-react', '@radix-ui/react-tooltip'],
        },
      },
    },
  },
  // Define environment variables for the client
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
  },
}));
