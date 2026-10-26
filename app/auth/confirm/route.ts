import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { safeNextPath } from '../../../lib/site-url';

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change'];

// Handles both email-link styles: ?token_hash&type (custom template) and ?code (PKCE redirect).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') as EmailOtpType | null;
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), type === 'recovery' ? '/reset-password' : '/dashboard');

  const supabase = await createClient();
  let failed = true;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    failed = Boolean((await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error);
  } else if (code) {
    failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  }

  const destination = request.nextUrl.clone();
  destination.search = '';
  if (failed) {
    destination.pathname = '/login';
    destination.searchParams.set('error', 'link');
  } else {
    const [path, query] = next.split('?');
    destination.pathname = path;
    if (query) destination.search = `?${query}`;
  }
  return NextResponse.redirect(destination);
}
