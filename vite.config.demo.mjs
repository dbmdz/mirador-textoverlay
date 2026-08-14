import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: resolve(import.meta.dirname, "demo/dist"),
    rollupOptions: {
      input: {
        demo: resolve(import.meta.dirname, "index.html"),
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
