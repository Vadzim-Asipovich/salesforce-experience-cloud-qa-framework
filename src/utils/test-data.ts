import type { CreateAccountInput } from '@src/api/schemas/account.schema';

/** Deterministic-enough-for-CI unique suffix (worker index + timestamp would work too;
 *  kept dependency-free and collision-safe within a single test run). */
let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** Builder for a valid Account creation payload, with sane defaults and easy overrides. */
export function buildAccountInput(overrides: Partial<CreateAccountInput> = {}): CreateAccountInput {
  return {
    Name: unique('QA-Automation-Account'),
    Type: 'Prospect',
    Industry: 'Technology',
    AnnualRevenue: 1_000_000,
    Phone: '+1-555-0100',
    Website: 'https://example.com',
    BillingCity: 'San Francisco',
    ...overrides,
  };
}
