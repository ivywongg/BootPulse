import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './auth-constants';
import { findSessionUser, revokeLocalSession } from './local-auth';

export async function getAuthenticatedUser() {
  return findSessionUser((await cookies()).get(SESSION_COOKIE)?.value);
}

// Existing callers retain this API; reads never provision users from client cookies.
export async function getOrCreateUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  return user;
}

export async function setAuthenticationCookie(token: string) {
  const store = await cookies();
  revokeLocalSession(store.get(SESSION_COOKIE)?.value);
  const requestHeaders = await headers();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || requestHeaders.get('x-forwarded-proto') === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  store.delete('bp_consent');
  store.delete('bp_business');
}

export async function clearAuthentication() {
  const store = await cookies();
  revokeLocalSession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  store.delete('bp_consent');
  store.delete('bp_business');
}
