import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { type APIRequestContext } from '@playwright/test';
import { env, apiBaseUrl } from '@src/config/env';
import { TokenResponseSchema, type TokenResponse } from '../schemas/common.schema';
import { logger } from '@src/utils/logger';

/**
 * Salesforce's OAuth 2.0 JWT Bearer flow: sign a short-lived JWT assertion
 * with the Connected App's private key, exchange it for an access token.
 * No interactive login, no refresh token to rotate — the standard choice
 * for CI service accounts. See docs/ARCHITECTURE.md for the Connected App
 * setup this expects when pointed at a real org.
 *
 * Against the built-in mock (USE_MOCK_SF_API=true, the default) the same
 * code path runs: the mock's /services/oauth2/token trusts any
 * well-formed POST and hands back a token, so the client under test never
 * has a mock-only branch to diverge from production behaviour.
 */
export class JwtAuthProvider {
  constructor(private readonly request: APIRequestContext) {}

  async authenticate(): Promise<TokenResponse> {
    const assertion = env.USE_MOCK_SF_API ? 'mock-assertion' : this.buildSignedAssertion();

    const response = await this.request.post(`${apiBaseUrl()}/services/oauth2/token`, {
      form: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      logger.error('JWT token exchange failed', { status: response.status(), body });
      throw new Error(`Token exchange failed with status ${response.status()}`);
    }

    const json = await response.json();
    const parsed = TokenResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Token response failed schema validation: ${parsed.error.message}`);
    }

    logger.info('Authenticated against Salesforce API', {
      instance_url: parsed.data.instance_url,
      // access_token is redacted automatically by the logger.
      access_token: parsed.data.access_token,
    });
    return parsed.data;
  }

  /** Builds and RS256-signs the JWT assertion Salesforce expects. Real-org path only. */
  private buildSignedAssertion(): string {
    if (!env.SF_CLIENT_ID || !env.SF_USERNAME || !env.SF_JWT_PRIVATE_KEY_PATH) {
      throw new Error(
        'SF_CLIENT_ID, SF_USERNAME and SF_JWT_PRIVATE_KEY_PATH are required when USE_MOCK_SF_API=false',
      );
    }
    const privateKey = fs.readFileSync(env.SF_JWT_PRIVATE_KEY_PATH, 'utf-8');
    const nowSeconds = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        iss: env.SF_CLIENT_ID,
        sub: env.SF_USERNAME,
        aud: env.SF_LOGIN_URL,
        exp: nowSeconds + 180,
      },
      privateKey,
      { algorithm: 'RS256' },
    );
  }
}
