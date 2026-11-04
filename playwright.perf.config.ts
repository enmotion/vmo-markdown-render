import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.perf.ts',
  timeout: 300_000,
  workers: 1,
  retries: 0,
  // Keep the production fixture outside Playwright's automatically cleaned directory.
  outputDir: 'test-results/render-perf-runs',
  use: {
    baseURL: 'http://127.0.0.1:1981',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'npx vite preview --config vite.perf.config.ts --host 127.0.0.1 --port 1981 --strictPort',
    url: 'http://127.0.0.1:1981/e2e/fixtures/render-perf.html',
    reuseExistingServer: false,
  },
});
