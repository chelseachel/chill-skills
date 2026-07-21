import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname)],
    },
  },
  preview: {
    port: 5178,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-renderer'),
    emptyOutDir: true,
  },
});
