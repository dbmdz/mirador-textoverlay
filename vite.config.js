import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const buildMode = process.env.BUILD_MODE ?? 'plugin';

const pluginConfig = {
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^@emotion\/(react|styled)/,
        /^@mui\/(icons-material|material|system)/,
        'mirador',
        'react',
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
};

const demoConfig = {
  build: {
    outDir: resolve(__dirname, 'demo/dist'),
    rollupOptions: {
      input: {
        demo: resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [react()],
  server: {
    open: true,
  },
};

export default defineConfig(buildMode !== 'demo' ? pluginConfig : demoConfig);
