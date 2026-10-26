import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath, updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    // A missing variable or an unreachable auth service must not take down public pages.
    console.error('proxy: session refresh failed:', error instanceof Error ? error.message : error);
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
    return new NextResponse(
      'Authentication is unavailable. Check the Supabase environment variables and try again.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
