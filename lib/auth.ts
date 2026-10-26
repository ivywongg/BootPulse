import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ensureAppUser } from './provision';
import { createClient } from './supabase/server';

/** Verified identity: getUser() validates the session with Supabase Auth; the cookie alone is never trusted. */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return ensureAppUser(data.user);
});

export async function getOrCreateUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  return user;
}
