import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON_BUILD === 'true';

  return {
    plugins: [react()],
    base: isElectron ? './' : '/',
    build: {
      outDir: isElectron ? path.resolve(__dirname, '../desktop/dist/web') : 'dist',
      emptyOutDir: true
    },
    server: {
      port: 3002,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  };
}); 