import {
  test as base,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import { SalesforceRestClient } from '../clients/salesforce-rest.client';

interface ApiFixtures {
  /** A fresh, unauthenticated API request context — scoped per test. */
  apiContext: APIRequestContext;
  /** An authenticated Salesforce REST client, ready to use. Authenticates once per test. */
  sfClient: SalesforceRestClient;
}

/**
 * Extends the base Playwright test with API-testing fixtures so specs stay
 * declarative: `test('...', async ({ sfClient }) => { ... })` instead of
 * every spec repeating context creation and auth boilerplate.
 */
export const test = base.extend<ApiFixtures>({
  // Playwright requires the literal `{}` destructuring pattern here to statically detect fixture deps.
  // eslint-disable-next-line no-empty-pattern
  apiContext: async ({}, use) => {
    const context = await playwrightRequest.newContext();
    await use(context);
    await context.dispose();
  },

  sfClient: async ({ apiContext }, use) => {
    const client = new SalesforceRestClient(apiContext);
    await client.authenticate();
    await use(client);
  },
});

export { expect } from '@playwright/test';
