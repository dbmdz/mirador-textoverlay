import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^@emotion\/(react|styled)/,
        /^@mui\/(icons-material|material|system)/,
        'mirador',
        'react',
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        'react-dom',
        'react-i18next',
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [react()],
  server: {
    open: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
  },
});
