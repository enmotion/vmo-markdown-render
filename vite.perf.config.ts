import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Independent production fixture: no demo application or declaration generation.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'test-results/render-perf-app',
    rollupOptions: { input: 'e2e/fixtures/render-perf.html' },
  },
});
