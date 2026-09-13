import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'artifacts/pos-system/src/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'artifacts/pos-system/src'),
        '@workspace/api-client-react': path.resolve(__dirname, 'artifacts/pos-system/src/lib/api-client-react.tsx'),
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
