import { test, expect } from '@src/api/fixtures/api-fixtures';
import { buildAccountInput } from '@src/utils/test-data';
import { SalesforceApiError } from '@src/api/clients/salesforce-rest.client';
import { issue, testCase } from '@src/utils/traceability';

test.describe('Account sobject — CRUD', { tag: ['@regression', '@accounts'] }, () => {
  test(
    'creates, reads, updates and deletes an Account end to end',
    { tag: '@smoke', annotation: [issue('ST-401'), testCase('ST-TC-401')] },
    async ({ sfClient, trackedAccountIds }) => {
      const input = buildAccountInput({ Industry: 'Financial Services' });

      const created = await test.step('create', async () => {
        const result = await sfClient.createAccount(input);
        trackedAccountIds.push(result.id); // safety net if a later step throws
        expect(result.success).toBe(true);
        expect(result.id).toMatch(/^001/);
        return result;
      });

      await test.step('read back and verify field values', async () => {
        const account = await sfClient.getAccount(created.id);
        expect(account.Id).toBe(created.id);
        expect(account.Name).toBe(input.Name);
        expect(account.Industry).toBe('Financial Services');
      });

      await test.step('update a field', async () => {
        await sfClient.updateAccount(created.id, { Industry: 'Healthcare' });
        const updated = await sfClient.getAccount(created.id);
        expect(updated.Industry).toBe('Healthcare');
        // Fields not part of the update payload must be left untouched.
        expect(updated.Name).toBe(input.Name);
      });

      await test.step('delete and verify it is gone', async () => {
        await sfClient.deleteAccount(created.id);
        await expect(sfClient.getAccount(created.id)).rejects.toThrow(SalesforceApiError);
      });
    },
  );

  test(
    'rejects account creation without a required Name field',
    { annotation: [issue('ST-402')] },
    async ({ sfClient }) => {
      // Bypass the schema-validating builder to exercise the server's own
      // validation, mirroring how a real malformed integration payload behaves.
      const invalidInput = { Industry: 'Technology' } as unknown as Parameters<
        typeof sfClient.createAccount
      >[0];

      await expect(sfClient.createAccount(invalidInput)).rejects.toMatchObject({
        errorCode: 'REQUIRED_FIELD_MISSING',
        fields: ['Name'],
      });
    },
  );
});
