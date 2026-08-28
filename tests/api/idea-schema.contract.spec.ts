import { test, expect } from '../../src/api/fixtures/api-fixtures';
import { IdeaSchema } from '../../src/api/schemas/idea.schema';

/**
 * Contract test: the `Idea` record served by the API must match both the
 * zod schema AND the same record's id/title as rendered by the UI layer
 * (tests/ui/idea-detail.spec.ts hits the identical id on the live public
 * site). Two independent layers agreeing on one record's shape is a
 * cheap, high-signal cross-check that the API and UI test suites aren't
 * silently drifting apart from what production actually serves.
 */
const KNOWN_IDEA_ID = 'a0B8W00000GdiWiUAJ';
const KNOWN_IDEA_TITLE =
  "Dependent page layouts - data rules to show, hide, or make fields/sections req'd";

test.describe('Idea sobject — schema contract @api', () => {
  test('getIdea returns a payload matching the published IdeaSchema', async ({ sfClient }) => {
    const idea = await sfClient.getIdea(KNOWN_IDEA_ID);

    expect(() => IdeaSchema.parse(idea)).not.toThrow();
    expect(idea.Id).toBe(KNOWN_IDEA_ID);
    expect(idea.Name).toBe(KNOWN_IDEA_TITLE);
    expect(idea.Status__c).toBe('Delivered');
    expect(idea.Points__c).toBeGreaterThan(0);
  });

  test('unknown idea id surfaces a NOT_FOUND Salesforce error', async ({ sfClient }) => {
    await expect(sfClient.getIdea('a0Bdoesnotexist000')).rejects.toMatchObject({
      status: 404,
      errorCode: 'NOT_FOUND',
    });
  });
});
