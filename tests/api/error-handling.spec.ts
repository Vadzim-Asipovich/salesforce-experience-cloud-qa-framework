import { request as playwrightRequest } from '@playwright/test';
import { test, expect } from '@src/api/fixtures/api-fixtures';
import { SalesforceApiError } from '@src/api/clients/salesforce-rest.client';
import { apiBaseUrl } from '@src/config/env';
import { logger } from '@src/utils/logger';
import { issue } from '@src/utils/traceability';

test.describe('Error handling & security', { tag: ['@regression', '@errors'] }, () => {
  test(
    'unauthenticated requests are rejected with INVALID_SESSION_ID',
    { tag: '@smoke', annotation: [issue('ST-421')] },
    async ({ apiContext }) => {
      const response = await apiContext.get(
        `${apiBaseUrl()}/services/data/v61.0/sobjects/Account/001anything`,
      );
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body[0].errorCode).toBe('INVALID_SESSION_ID');
    },
  );

  test(
    'reading a non-existent Account raises a typed SalesforceApiError',
    { annotation: [issue('ST-422')] },
    async ({ sfClient }) => {
      await expect(sfClient.getAccount('001DOESNOTEXIST00')).rejects.toMatchObject({
        status: 404,
        errorCode: 'NOT_FOUND',
      });
    },
  );

  test(
    'SalesforceApiError instances carry status/errorCode/fields for callers to branch on',
    { annotation: [issue('ST-423')] },
    async ({ sfClient }) => {
      const rejection = sfClient.getAccount('001DOESNOTEXIST00');

      await expect(rejection).rejects.toBeInstanceOf(SalesforceApiError);
      await expect(rejection).rejects.toMatchObject({
        status: 404,
        errorCode: 'NOT_FOUND',
        fields: expect.any(Array),
      });
    },
  );

  test(
    'access tokens are never written to logs in plain text',
    { tag: '@smoke', annotation: [issue('ST-424')] },
    () => {
      const masked = logger._maskString('Authorization: Bearer 00D000000000EXAMPLETOKENVALUE');
      expect(masked).not.toContain('EXAMPLETOKENVALUE');
      expect(masked).toContain('[REDACTED]');
    },
  );

  test(
    'a disposed API request context refuses further use (proves fixtures clean up)',
    { annotation: [issue('ST-425')] },
    async () => {
      const context = await playwrightRequest.newContext();
      await context.dispose();
      await expect(context.get(`${apiBaseUrl()}/services/oauth2/token`)).rejects.toThrow();
    },
  );
});
