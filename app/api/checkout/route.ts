import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { subscriptions } from '../../../db/schema';
import { getAuthenticatedUser } from '../../../lib/auth';
import { isSameOriginRequest, readBoundedBody } from '../../../lib/request-security';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const body = await readBoundedBody(request);
  if (url.search || body === null || body.length > 0) {
    return NextResponse.json({ error: 'This endpoint does not accept input.' }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  db
    .insert(subscriptions)
    .values({ userId: user.id, plan: 'founder', status: 'active' })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { plan: 'founder', status: 'active' },
    })
    .run();

  return NextResponse.redirect(new URL('/pricing?upgraded=founder', request.url), 303);
}
