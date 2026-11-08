/** The deployment proxy must overwrite forwarded headers, never append client input. */
export function publicOrigin(request: Request): string | null {
  const configured = process.env.APP_ORIGIN;
  if (configured) {
    try { return new URL(configured).origin; } catch { return null; }
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  if (!host || /[,\s/\\@?#]/.test(host) || !['http', 'https'].includes(protocol)) return null;
  try { return new URL(`${protocol}://${host}`).origin; } catch { return null; }
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.origin === publicOrigin(request);
  } catch { return false; }
}
