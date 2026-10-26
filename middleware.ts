import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'bp_session';
const publicPaths = new Set(['/', '/login', '/sign-up', '/pricing']);

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/sign-up/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  // Format is only a routing pre-check, never proof of identity.
  // Pages, actions and API routes validate the session against local_sessions.
  if (session && /^[a-f0-9]{64}$/.test(session)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
