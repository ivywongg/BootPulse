export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const allowed = new Set([new URL(request.url).origin]);
    const host = request.headers.get('host');
    if (host) {
      const forwardedProtocol = request.headers.get('x-forwarded-proto');
      const protocol = forwardedProtocol === 'https' ? 'https:' : new URL(request.url).protocol;
      const target = new URL(`${protocol}//${host}`);
      if (!target.username && !target.password && target.host.toLowerCase() === host.toLowerCase()) allowed.add(target.origin);
    }
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
      const publicUrl = new URL(configured);
      if (publicUrl.protocol === 'http:' || publicUrl.protocol === 'https:') allowed.add(publicUrl.origin);
    }
    const supplied = new URL(origin);
    return (supplied.protocol === 'http:' || supplied.protocol === 'https:') && supplied.origin === origin && allowed.has(origin);
  } catch {
    return false;
  }
}

export async function readBoundedBody(request: Request, limit = 2048): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
