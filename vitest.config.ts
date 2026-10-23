import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { '@comps': resolve(__dirname, 'components') } },
  plugins: [vue()],
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100, perFile: true },
      include: ['components/**/*.{ts,vue}', 'use.lib/**/*.ts', 'index.ts'],
      exclude: ['**/*.d.ts', 'components/markdown-render/types.ts', 'components/markdown-input/types.ts', 'use.lib/markdown/engine/types.ts'],
      reporter: ['text', 'json', 'html', 'json-summary'],
    },
  },
});
