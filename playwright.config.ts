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
  workers: env.CI ? 4 : undefined,

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
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.UI_BASE_URL,
      },
    },
    {
      name: 'ui-firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'], baseURL: env.UI_BASE_URL },
    },
    {
      name: 'ui-webkit',
      testDir: './tests/ui',
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
