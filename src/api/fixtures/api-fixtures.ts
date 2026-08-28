import {
  test as base,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import { SalesforceRestClient } from '../clients/salesforce-rest.client';
import { JwtAuthProvider } from '../auth/jwt-auth.provider';
import type { TokenResponse } from '../schemas/common.schema';

interface ApiFixtures {
  /** A fresh, unauthenticated API request context — scoped per test. */
  apiContext: APIRequestContext;
  /** An authenticated Salesforce REST client, ready to use. */
  sfClient: SalesforceRestClient;
  /**
   * Account ids created during a test. Anything pushed here is deleted in
   * fixture teardown, so a mid-test failure can't leak a record — the
   * spec's own explicit delete stays as a real assertion on DELETE.
   */
  trackedAccountIds: string[];
}

interface ApiWorkerFixtures {
  /** JWT Bearer token, exchanged once per worker and reused across its tests. */
  authToken: TokenResponse;
}

/**
 * Extends the base Playwright test with API-testing fixtures so specs stay
 * declarative: `test('...', async ({ sfClient }) => { ... })` instead of
 * every spec repeating context creation and auth boilerplate.
 */
export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  authToken: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const ctx = await playwrightRequest.newContext();
      const token = await new JwtAuthProvider(ctx).authenticate();
      await ctx.dispose();
      await use(token);
    },
    { scope: 'worker' },
  ],

  // Playwright requires the literal `{}` destructuring pattern here to statically detect fixture deps.
  // eslint-disable-next-line no-empty-pattern
  apiContext: async ({}, use) => {
    const context = await playwrightRequest.newContext();
    await use(context);
    await context.dispose();
  },

  sfClient: async ({ apiContext, authToken }, use) => {
    await use(new SalesforceRestClient(apiContext).useToken(authToken));
  },

  trackedAccountIds: async ({ sfClient }, use) => {
    const ids: string[] = [];
    await use(ids);
    await Promise.allSettled(ids.map((id) => sfClient.deleteAccount(id)));
  },
});

export { expect } from '@playwright/test';
