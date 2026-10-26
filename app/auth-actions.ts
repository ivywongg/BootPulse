'use server';

import { redirect } from 'next/navigation';
import { authenticateLocalAccount, registerLocalAccount } from '../lib/local-auth';
import { setAuthenticationCookie } from '../lib/auth';
import { emailSchema, loginSchema, signupSchema, type AuthFormState } from '../lib/auth-validation';

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!(formData instanceof FormData)) return { error: 'Invalid signup submission.' };
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    consent: formData.get('consent'),
    consentVersion: formData.get('consentVersion'),
  });
  if (!parsed.success) return { error: 'Enter a valid email and a password of 8–128 characters, and accept the current statement.' };
  let account;
  try {
    account = await registerLocalAccount(parsed.data);
  } catch {
    return { error: 'Unable to create an account with these details. Try signing in or use another email address.' };
  }
  await setAuthenticationCookie(account.token);
  redirect('/dashboard');
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!(formData instanceof FormData)) return { error: 'Email or password is incorrect.' };
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Email or password is incorrect.' };
  const account = await authenticateLocalAccount(parsed.data);
  if (!account) return { error: 'Email or password is incorrect.' };
  await setAuthenticationCookie(account.token);
  redirect('/dashboard');
}

export async function requestPasswordReset(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!(formData instanceof FormData) || !emailSchema.safeParse(formData.get('email')).success) {
    return { error: 'Enter a valid email address.' };
  }
  // No email provider exists in the approved local demo. Never expose a reset token or claim delivery.
  return { error: 'Password-reset email is not configured in this local demo. No reset instructions were sent.' };
}
