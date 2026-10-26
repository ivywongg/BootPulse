import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from './env';

const PUBLIC_PATHS = new Set(['/', '/login', '/sign-up', '/forgot-password', '/pricing']);

function isPublic(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/auth/');
}

/** Refreshes the Supabase session cookies and redirects signed-out visitors away from app routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims validates the JWT signature; pages and actions re-check with getUser().
  const { data } = await supabase.auth.getClaims();
  if (data?.claims || isPublic(request.nextUrl.pathname)) return response;

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
