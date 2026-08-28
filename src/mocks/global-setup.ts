import type { FullConfig } from '@playwright/test';
import { env } from '@src/config/env';
import { startMockServer } from './salesforce-mock-server';

/**
 * Runs once before the whole test run. When USE_MOCK_SF_API=true (the CI
 * and default-local behaviour) it boots the in-process Salesforce API
 * mock so the `api` project has something deterministic to talk to. When
 * pointed at a real org (USE_MOCK_SF_API=false) this is a no-op — the
 * real Salesforce instance is already "running".
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (!env.USE_MOCK_SF_API) return;

  const server = await startMockServer(env.MOCK_SF_API_PORT);
  // Stash the server on `globalThis` so global-teardown (a separate
  // process-tick in Playwright's model) can close it. Playwright keeps
  // the global-setup/teardown pair in the same process, so this is safe.
  (globalThis as unknown as { __mockSfServer?: unknown }).__mockSfServer = server;
}
