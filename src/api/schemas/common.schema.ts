import { z } from 'zod';

/** OAuth2 JWT Bearer token exchange response — same shape mock and real. */
export const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  instance_url: z.string().url(),
  token_type: z.literal('Bearer'),
  issued_at: z.string().optional(),
  signature: z.string().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/** Salesforce's REST API error envelope: an array of these, even for one error. */
export const SalesforceErrorSchema = z.object({
  message: z.string(),
  errorCode: z.string(),
  fields: z.array(z.string()).optional().default([]),
});
export const SalesforceErrorResponseSchema = z.array(SalesforceErrorSchema).min(1);
export type SalesforceError = z.infer<typeof SalesforceErrorSchema>;

/** Response shape for sobject create (POST). */
export const CreateResultSchema = z.object({
  id: z.string().min(15),
  success: z.boolean(),
  errors: z.array(z.unknown()),
});
export type CreateResult = z.infer<typeof CreateResultSchema>;
