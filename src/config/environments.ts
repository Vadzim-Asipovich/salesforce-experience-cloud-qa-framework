/**
 * Named environment profiles. `TEST_ENV` selects one; each field it defines
 * is a *default* that an explicit environment variable of the same name
 * still overrides (see `loadEnv` in ./env.ts). This keeps call sites
 * (`env.UI_BASE_URL`, `apiBaseUrl()`, …) unchanged while making
 * `TEST_ENV=qa npm run test:ui` a one-word switch.
 *
 * The `qa` / `staging` URLs are deliberately placeholders — this repo runs
 * against Salesforce's public site + the bundled mock. Point them at a real
 * Experience Cloud domain (and provide a Connected App for JWT) to use them.
 */
export const TEST_ENVS = ['local', 'qa', 'staging', 'prod'] as const;
export type TestEnv = (typeof TEST_ENVS)[number];

export interface EnvProfile {
  UI_BASE_URL: string;
  SF_LOGIN_URL: string;
  USE_MOCK_SF_API: boolean;
}

export const PROFILES: Record<TestEnv, EnvProfile> = {
  local: {
    UI_BASE_URL: 'https://ideas.salesforce.com',
    SF_LOGIN_URL: 'https://test.salesforce.com',
    USE_MOCK_SF_API: true,
  },
  qa: {
    UI_BASE_URL: 'https://qa.example-experience-cloud.com', // placeholder
    SF_LOGIN_URL: 'https://test.salesforce.com',
    USE_MOCK_SF_API: false,
  },
  staging: {
    UI_BASE_URL: 'https://staging.example-experience-cloud.com', // placeholder
    SF_LOGIN_URL: 'https://test.salesforce.com',
    USE_MOCK_SF_API: false,
  },
  prod: {
    UI_BASE_URL: 'https://ideas.salesforce.com',
    SF_LOGIN_URL: 'https://login.salesforce.com',
    USE_MOCK_SF_API: true,
  },
};
