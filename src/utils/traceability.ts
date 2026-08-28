import { env } from '@src/config/env';

/**
 * Requirement/test-case traceability. Attach the return values to a test's
 * `annotation` list:
 *
 *   test('...', { tag: ['@regression'], annotation: [issue('ST-142')] }, async () => { ... });
 *
 * Playwright renders annotations in the HTML report and serialises them
 * into the JUnit XML `<properties>` already produced on CI, which an
 * Xray / Zephyr "import execution results" step consumes to close the loop
 * back to the tracker. Point `JIRA_BASE_URL` at a real instance to make
 * the `issue` links resolve.
 */
export function issue(key: string): { type: string; description: string } {
  return { type: 'issue', description: `${env.JIRA_BASE_URL}/${key}` };
}

export function testCase(key: string): { type: string; description: string } {
  return { type: 'test-case', description: key };
}
