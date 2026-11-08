/** The deployment proxy must overwrite forwarded headers, never append client input. */
export function publicOrigin(request: Request): string | null {
  const configured = process.env.APP_ORIGIN || process.env.V0_RUNTIME_URL || process.env.V0_BUILD_URL;
  if (configured) {
    try { return new URL(configured).origin; } catch { return null; }
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  if (!host || /[,\s/\\@?#]/.test(host) || !['http', 'https'].includes(protocol)) return null;
  try { return new URL(`${protocol}://${host}`).origin; } catch { return null; }
}
function isVercelPreviewOrigin(origin: URL): boolean {
  return origin.protocol === 'https:' &&
    (origin.hostname.endsWith('.vercel.app') ||
      origin.hostname.endsWith('.vercel.run') ||
      origin.hostname.endsWith('.vusercontent.net'));
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (process.env.V0_RUNTIME_URL && request.headers.has('sec-fetch-site')) return true;
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const expected = publicOrigin(request);
    if (expected && parsed.origin === expected) return true;

    const requestUrl = new URL(request.url);
    const localOrigin = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/;
    if (localOrigin.test(parsed.hostname) && localOrigin.test(requestUrl.hostname)) return true;

    // In the preview proxy, the server can see its internal host while the
    // browser sends the public HTTPS preview origin.
    const serverHost = request.headers.get('host') ?? '';
    const forwardedHost = request.headers.get('x-forwarded-host') ?? '';
    return isVercelPreviewOrigin(parsed) &&
      (serverHost.startsWith('localhost:') || serverHost === 'localhost') &&
      (!forwardedHost || forwardedHost.startsWith('localhost:'));
  } catch { return false; }
}
