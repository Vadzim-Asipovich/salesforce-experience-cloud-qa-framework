import { z } from 'zod';

/** A (deliberately trimmed) view of the standard Salesforce `Account` sobject. */
export const AccountSchema = z.object({
  Id: z.string().regex(/^001[\w]{12,15}$/, "Account Id must match Salesforce's 001 key prefix"),
  Name: z.string().min(1),
  Type: z.string().nullable().optional(),
  Industry: z.string().nullable().optional(),
  AnnualRevenue: z.number().nullable().optional(),
  Phone: z.string().nullable().optional(),
  Website: z.string().nullable().optional(),
  BillingCity: z.string().nullable().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

/** Payload accepted when creating an Account — Id is server-assigned. */
export const CreateAccountInputSchema = AccountSchema.omit({ Id: true }).extend({
  Name: z.string().min(1, 'Name is required'),
});
export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;

export const UpdateAccountInputSchema = CreateAccountInputSchema.partial();
export type UpdateAccountInput = z.infer<typeof UpdateAccountInputSchema>;
