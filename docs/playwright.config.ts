import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: './tests/e2e',
  // jsdom's focus model is not trustworthy for real focus and tab-order
  // assertions, which is the whole reason this suite exists. See docs/04.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build the packages first, then the site. The docs site imports the
    // workspace packages through their `exports` maps, so it consumes dist/,
    // not src/ — which is useful (this suite exercises the published entry
    // points) and a trap (a stale dist silently tests code that is no longer in
    // the tree). Both builds are seconds; the ambiguity is not worth saving.
    command: `pnpm -w run build && pnpm build && pnpm preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
