import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { UserId } from "./model";
const globals = globalThis as typeof globalThis & { demoKey?: Buffer };
const key = (globals.demoKey ??= randomBytes(32));
export function token(user: UserId) {
  const value = `${user}.${Date.now() + 86400000}`;
  return `${value}.${createHmac("sha256", key).update(value).digest("hex")}`;
}
export async function currentUser(): Promise<UserId | null> {
  const raw = (await cookies()).get("cr-demo-session")?.value;
  if (!raw) return null;
  const [u, expires, sig] = raw.split(".");
  if (
    !["rafael", "claudecir"].includes(u) ||
    Number(expires) < Date.now() ||
    !sig
  )
    return null;
  const expected = createHmac("sha256", key)
    .update(`${u}.${expires}`)
    .digest("hex");
  const a = Buffer.from(sig),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? (u as UserId) : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
