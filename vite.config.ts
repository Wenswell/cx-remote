import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'src/web',
  publicDir: false,
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      '/api': 'http://127.0.0.1:3030',
    },
  },
});
