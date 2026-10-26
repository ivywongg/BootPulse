import { z } from 'zod';
import { CONSENT_VERSION } from './auth-constants';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const loginSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();
export const signupSchema = loginSchema.extend({
  consent: z.literal('accepted'),
  consentVersion: z.literal(CONSENT_VERSION),
}).strict();

export type AuthFormState = { error: string | null };
