import type http from 'node:http';
import { env } from '@src/config/env';
import { stopMockServer } from './salesforce-mock-server';

export default async function globalTeardown(): Promise<void> {
  if (!env.USE_MOCK_SF_API) return;

  const server = (globalThis as unknown as { __mockSfServer?: http.Server }).__mockSfServer;
  if (server) await stopMockServer(server);
}
