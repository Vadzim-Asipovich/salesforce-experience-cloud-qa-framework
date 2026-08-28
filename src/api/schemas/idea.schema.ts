import { z } from 'zod';

/**
 * Custom `Idea` sobject shape, modelled on the real record served at
 * https://ideas.salesforce.com/s/idea/a0B8W00000GdiWiUAJ/... (the `a0B`
 * prefix is a genuine Salesforce custom-object key prefix). Used by the
 * contract test that cross-checks the API layer's schema against what the
 * UI layer renders for the same record — see
 * tests/api/idea-schema.contract.spec.ts.
 */
// The set actually observed across the live site's top 50-by-points and
// most-recent-by-date results (2026-08-27). IdeaExchange may use further
// values outside that sample (e.g. an early-stage "Under Review"); treat
// this enum as the verified floor, not a guaranteed-complete ceiling.
export const IdeaStatusSchema = z.enum(['Open', 'In Development', 'Delivered', 'Archived']);

export const IdeaSchema = z.object({
  Id: z.string().regex(/^a0B[\w]{12,15}$/, "Idea Id must match the custom object's a0B key prefix"),
  Name: z.string().min(1),
  Status__c: IdeaStatusSchema,
  Points__c: z.number().int().nonnegative(),
  CategoryPath__c: z.string().min(1),
  // Salesforce serialises dates as e.g. "2006-11-16T00:00:00.000+0000" —
  // a valid ISO-8601 offset, but without the colon zod's built-in
  // `.datetime()` regex requires, hence a Date.parse-based check instead.
  CreatedDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'must be a parseable date'),
});
export type Idea = z.infer<typeof IdeaSchema>;
