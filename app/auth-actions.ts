'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import { getSiteUrl, safeNextPath } from '../lib/site-url';
import {
  CONSENT_VERSION,
  emailSchema,
  loginSchema,
  passwordSchema,
  signupSchema,
  type AuthFormState,
} from '../lib/auth-validation';

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    consent: formData.get('consent'),
    consentVersion: formData.get('consentVersion'),
  });
  if (!parsed.success) {
    return { error: 'Enter a valid email and a password of 8–128 characters, and accept the current statement.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await getSiteUrl()}/auth/confirm?next=/dashboard`,
      // Consent is recorded server-side here; the app profile copies it on first sign-in.
      data: { consent_version: CONSENT_VERSION, consent_at: new Date().toISOString() },
    },
  });
  if (error) {
    return {
      error: error.code === 'weak_password'
        ? error.message
        : 'Unable to create an account with these details. Try again or sign in.',
    };
  }
  if (data.session) redirect('/dashboard');
  // Same message whether or not the address is already registered, so emails are not revealed.
  return { error: null, message: 'Check your email to confirm your account, then sign in.' };
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Email or password is incorrect.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: error.code === 'email_not_confirmed'
        ? 'Confirm your email address first. Check your inbox for the confirmation link.'
        : 'Email or password is incorrect.',
    };
  }
  redirect(safeNextPath(formData.get('from')));
}

export async function requestPasswordReset(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get('email'));
  if (!email.success) return { error: 'Enter a valid email address.' };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await getSiteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Never reveal whether the address has an account.
  return { error: null, message: 'If an account exists for that address, recovery instructions have been emailed.' };
}

export async function updatePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = passwordSchema.safeParse(formData.get('password'));
  if (!password.success) return { error: 'Use a password of 8–128 characters.' };
  if (password.data !== formData.get('confirmPassword')) return { error: 'The two passwords do not match.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return {
      error: error.code === 'weak_password'
        ? error.message
        : 'Unable to update the password. The recovery link may have expired; request a new one.',
    };
  }
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
