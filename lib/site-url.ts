import { headers } from 'next/headers';

/** Public origin used in email redirect links: NEXT_PUBLIC_APP_URL when set, otherwise the request host. */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

/** Only same-site relative paths may be used as post-login destinations. */
export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  return typeof value === 'string' && /^\/(?!\/)[\w\-./?=&]*$/.test(value) ? value : fallback;
}
