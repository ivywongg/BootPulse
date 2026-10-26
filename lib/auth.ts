import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ensureAppUser, type AppUser } from './provision';
import { createClient } from './supabase/server';

type Resolved =
  | { status: 'anonymous' }
  | { status: 'needs_consent' }
  | { status: 'ok'; user: AppUser };

/** Verified identity: getUser() validates the session with Supabase Auth; the cookie alone is never trusted. */
const resolveUser = cache(async (): Promise<Resolved> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: 'anonymous' };
  const user = await ensureAppUser(data.user);
  // A signed-in account with no valid consent record (for example one created in the Supabase dashboard).
  return user ? { status: 'ok', user } : { status: 'needs_consent' };
});

export async function getAuthenticatedUser() {
  const resolved = await resolveUser();
  return resolved.status === 'ok' ? resolved.user : null;
}

export async function getOrCreateUser() {
  const resolved = await resolveUser();
  if (resolved.status === 'ok') return resolved.user;
  redirect(resolved.status === 'needs_consent' ? '/consent' : '/login');
}
