import 'dotenv/config';
import { z } from 'zod';
import { PROFILES, TEST_ENVS } from './environments';

/**
 * Single source of truth for runtime configuration.
 *
 * Every value the framework reads from the environment is validated here,
 * once, at process start — a typo'd or missing variable fails fast with a
 * readable message instead of surfacing as a confusing test failure three
 * layers down.
 *
 * Precedence for the fields a profile can set: an explicit environment
 * variable wins; otherwise the `TEST_ENV` profile's value; otherwise the
 * schema default below. See ./environments.ts.
 */
const EnvSchema = z.object({
  TEST_ENV: z.enum(TEST_ENVS).default('local'),

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

  // Layer the selected profile *under* anything the environment set explicitly.
  const profile = PROFILES[parsed.data.TEST_ENV];
  return {
    ...parsed.data,
    UI_BASE_URL: process.env.UI_BASE_URL ?? profile.UI_BASE_URL,
    SF_LOGIN_URL: process.env.SF_LOGIN_URL ?? profile.SF_LOGIN_URL,
    USE_MOCK_SF_API:
      process.env.USE_MOCK_SF_API !== undefined
        ? parsed.data.USE_MOCK_SF_API
        : profile.USE_MOCK_SF_API,
  };
}

export const env = loadEnv();

/** Base URL for the mock/real Salesforce REST API, derived once at startup. */
export function apiBaseUrl(): string {
  return env.USE_MOCK_SF_API ? `http://127.0.0.1:${env.MOCK_SF_API_PORT}` : env.SF_LOGIN_URL;
}
