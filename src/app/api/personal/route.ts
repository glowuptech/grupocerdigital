import { currentUser, sameOrigin } from "@/lib/session";
import { transaction } from "@/lib/repository";
import { personalView, personalCommand, syncPersonal } from "@/lib/personal";
import { personalSeed } from "@/lib/seed";
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Sessão necessária", { status: 401 });
  return Response.json(
    await transaction((db) => personalView(db.personal, user)),
    { headers: { "Cache-Control": "no-store" } },
  );
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
        if (type === "reset") db.personal[user] = personalSeed(user);
        else personalCommand(db.personal, user, type, payload);
        syncPersonal(db.state, db.personal);
        return personalView(db.personal, user);
      }),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
