import { publicOrigin } from "@/lib/request-origin";
import { cookies } from "next/headers";
import { currentUser, sameOrigin, token } from "@/lib/session";
export async function GET() {
  return Response.json({ user: await currentUser() });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return new Response("Origem inválida", { status: 403 });
  const { user } = await request.json();
  if (!["rafael", "claudecir"].includes(user))
    return new Response("Usuário demonstrativo inválido", { status: 400 });
  (await cookies()).set("cr-demo-session", token(user), {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" &&
      publicOrigin(request)?.startsWith("https://") === true,
    path: "/",
    maxAge: 86400,
  });
  return Response.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return new Response("Origem inválida", { status: 403 });
  (await cookies()).delete("cr-demo-session");
  return Response.json({ ok: true });
}
