import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Two independent projects, one config:
 *  - `ui`  → real browsers against the public Salesforce Experience Cloud
 *            site (UI_BASE_URL). Chromium always; Firefox/WebKit added on
 *            the nightly regression run (see .github/workflows).
 *  - `api` → no browser at all, just Playwright's APIRequestContext
 *            against the Salesforce REST API (mock by default; a real
 *            org when USE_MOCK_SF_API=false). `globalSetup` boots the
 *            in-process mock server before either project runs.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!env.CI,
  retries: env.CI ? 2 : 0,
  workers: env.CI ? 4 : 1,

  globalSetup: require.resolve('./src/mocks/global-setup'),
  globalTeardown: require.resolve('./src/mocks/global-teardown'),

  reporter: env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      // The `ui` projects drive the public Salesforce site over the open
      // internet; a cold Aura-app load alone can take 15s+ on the
      // non-Chromium engines, so the 30s default (kept for `api`, which
      // only talks to the in-process mock) is too tight here.
      timeout: 60_000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.UI_BASE_URL,
      },
    },
    {
      name: 'ui-firefox',
      testDir: './tests/ui',
      timeout: 60_000,
      use: { ...devices['Desktop Firefox'], baseURL: env.UI_BASE_URL },
    },
    {
      name: 'ui-webkit',
      testDir: './tests/ui',
      timeout: 60_000,
      use: { ...devices['Desktop Safari'], baseURL: env.UI_BASE_URL },
    },
    {
      name: 'api',
      testDir: './tests/api',
      // No `use.baseURL` — SalesforceRestClient resolves its own base URL
      // (mock server or real instance_url from the auth response).
    },
  ],
});
