import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 *
 * Every value the framework reads from the environment is validated here,
 * once, at process start — a typo'd or missing variable fails fast with a
 * readable message instead of surfacing as a confusing test failure three
 * layers down.
 */
const EnvSchema = z.object({
  UI_BASE_URL: z.string().url().default('https://ideas.salesforce.com'),

  USE_MOCK_SF_API: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  SF_LOGIN_URL: z.string().url().default('https://test.salesforce.com'),
  SF_API_VERSION: z.string().default('61.0'),
  SF_CLIENT_ID: z.string().optional().default(''),
  SF_USERNAME: z.string().optional().default(''),
  SF_JWT_PRIVATE_KEY_PATH: z.string().optional().default(''),

  MOCK_SF_API_PORT: z
    .string()
    .default('4010')
    .transform((v) => Number.parseInt(v, 10)),

  CI: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast with a readable summary rather than a wall of Zod internals.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  }
  return parsed.data;
}

export const env = loadEnv();

/** Base URL for the mock/real Salesforce REST API, derived once at startup. */
export function apiBaseUrl(): string {
  return env.USE_MOCK_SF_API ? `http://127.0.0.1:${env.MOCK_SF_API_PORT}` : env.SF_LOGIN_URL;
}
