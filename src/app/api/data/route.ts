import { currentUser, sameOrigin } from "@/lib/session";
import { transaction } from "@/lib/repository";
import { command } from "@/lib/commands";
import { seed } from "@/lib/seed";
import { audit } from "@/lib/operations";
export const runtime = "nodejs";
export async function GET() {
  if (!(await currentUser()))
    return new Response("Sessão necessária", { status: 401 });
  return Response.json(await transaction((db) => db.state), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Sessão necessária", { status: 401 });
  if (!sameOrigin(request))
    return new Response("Origem inválida", { status: 403 });
  try {
    const { type, payload } = await request.json();
    return Response.json(
      await transaction((db) => {
        if (type === "reset") {
          db.state = seed();
          audit(
            db.state,
            user,
            "reset",
            "Dados empresariais fictícios redefinidos.",
          );
          /* Personal reset is restricted to the current owner. */ db.personal[
            user
          ].entries = db.personal[user].entries.filter((e) => !e.paymentId);
        } else command(db.state, user, type, payload);
        return db.state;
      }),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
