import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { z } from 'zod';
import { env, apiBaseUrl } from '../../config/env';
import { JwtAuthProvider } from '../auth/jwt-auth.provider';
import { logger } from '../../utils/logger';
import {
  AccountSchema,
  type Account,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '../schemas/account.schema';
import { IdeaSchema, type Idea } from '../schemas/idea.schema';
import {
  CreateResultSchema,
  SalesforceErrorResponseSchema,
  type CreateResult,
  type TokenResponse,
} from '../schemas/common.schema';

/** Thrown when the API responds with Salesforce's `[{message, errorCode}]` error envelope. */
export class SalesforceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
    public readonly fields: string[] = [],
  ) {
    super(message);
    this.name = 'SalesforceApiError';
  }
}

/**
 * Typed, schema-validated client for the Salesforce REST API. Every method
 * validates the response shape with zod before handing it back — a field
 * Salesforce renames or removes fails the test with a precise diff instead
 * of a downstream `undefined is not a function`.
 */
export class SalesforceRestClient {
  private accessToken: string | undefined;
  private instanceUrl: string | undefined;

  constructor(private readonly request: APIRequestContext) {}

  /** Runs the JWT Bearer flow and stores the resulting token. */
  async authenticate(): Promise<void> {
    this.useToken(await new JwtAuthProvider(this.request).authenticate());
  }

  /**
   * Adopts an already-issued token — used by the worker-scoped `authToken`
   * fixture so the JWT exchange happens once per worker, not once per test.
   */
  useToken(token: TokenResponse): this {
    this.accessToken = token.access_token;
    this.instanceUrl = token.instance_url;
    return this;
  }

  private authHeader(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error(
        'SalesforceRestClient.authenticate()/useToken() must be called before making requests',
      );
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private baseUrl(): string {
    return this.instanceUrl ?? apiBaseUrl();
  }

  private sobjectsUrl(path: string): string {
    return `${this.baseUrl()}/services/data/v${env.SF_API_VERSION}/sobjects/${path}`;
  }

  /**
   * Throws a typed `SalesforceApiError` built from Salesforce's
   * `[{message, errorCode, fields}]` envelope when the response is not OK.
   * Shared by every method so the parsing lives in exactly one place.
   */
  private async throwIfNotOk(response: APIResponse, fallbackMessage: string): Promise<void> {
    if (response.ok()) return;

    const json: unknown = await response.json().catch(() => undefined);
    const errors = SalesforceErrorResponseSchema.safeParse(json);
    const first = errors.success ? errors.data[0] : undefined;
    logger.warn('Salesforce API returned an error', { status: response.status(), body: json });
    throw new SalesforceApiError(
      response.status(),
      first?.errorCode ?? 'UNKNOWN_ERROR',
      first?.message ?? fallbackMessage,
      first?.fields ?? [],
    );
  }

  /** Validates an OK response body against `schema`, or throws SalesforceApiError. */
  private async parseOrThrow<T>(response: APIResponse, schema: z.ZodType<T>): Promise<T> {
    await this.throwIfNotOk(response, `Request failed with status ${response.status()}`);

    const json: unknown = await response.json().catch(() => undefined);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Response failed schema validation: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async getAccount(id: string): Promise<Account> {
    const response = await this.request.get(this.sobjectsUrl(`Account/${id}`), {
      headers: this.authHeader(),
    });
    return this.parseOrThrow(response, AccountSchema);
  }

  // Note: request payloads are intentionally NOT zod-validated client-side.
  // TypeScript's `CreateAccountInput`/`UpdateAccountInput` types give
  // compile-time safety for normal callers; whether a given payload is
  // *accepted* is a server concern, and tests that deliberately send an
  // invalid payload (see accounts.crud.spec.ts) exercise that real
  // validation instead of being short-circuited by the client.
  async createAccount(input: CreateAccountInput): Promise<CreateResult> {
    const response = await this.request.post(this.sobjectsUrl('Account'), {
      headers: this.authHeader(),
      data: input,
    });
    return this.parseOrThrow(response, CreateResultSchema);
  }

  async updateAccount(id: string, input: UpdateAccountInput): Promise<void> {
    const response = await this.request.patch(this.sobjectsUrl(`Account/${id}`), {
      headers: this.authHeader(),
      data: input,
    });
    await this.throwIfNotOk(response, 'Update failed');
  }

  async deleteAccount(id: string): Promise<void> {
    const response = await this.request.delete(this.sobjectsUrl(`Account/${id}`), {
      headers: this.authHeader(),
    });
    await this.throwIfNotOk(response, 'Delete failed');
  }

  async getIdea(id: string): Promise<Idea> {
    const response = await this.request.get(this.sobjectsUrl(`Idea/${id}`), {
      headers: this.authHeader(),
    });
    return this.parseOrThrow(response, IdeaSchema);
  }
}
