import type { State, Personal, UserId } from "./model";
import { incoming, uid, integer, validDate } from "./finance";
// No caller-supplied owner. Principal must be obtained from the server session.
export function personalView(
  data: Record<UserId, Personal>,
  principal: UserId,
) {
  return structuredClone(data[principal]);
}
export function syncPersonal(s: State, data: Record<UserId, Personal>) {
  for (const p of s.payments) {
    const e = s.entries.find((e) => e.id === p.entryId);
    if (!e || incoming(e) || !e.personId) continue;
    const user = s.people.find((x) => x.id === e.personId)?.userId;
    if (!user) continue;
    const personal = data[user];
    if (personal.entries.some((x) => x.paymentId === p.id)) continue;
    personal.entries.push({
      id: uid(),
      paymentId: p.id,
      title: `${p.reversalOf ? "Estorno • " : ""}${e.title}`,
      amount: p.amount,
      kind: p.reversalOf ? "despesa" : "receita",
      date: p.date,
      categoryId: "salary",
      sourceId: "grupo-cr",
      accountId: personal.accounts[0].id,
    });
  }
}
export function personalCommand(
  data: Record<UserId, Personal>,
  principal: UserId,
  type: string,
  p: Record<string, string>,
) {
  const v = data[principal];
  switch (type) {
    case "entry": {
      integer(Number(p.amount));
      if (
        !v.accounts.some((a) => a.id === p.accountId) ||
        !v.categories.some((c) => c.id === p.categoryId && c.kind === p.kind) ||
        (p.sourceId && !v.sources.some((s) => s.id === p.sourceId))
      )
        throw Error("Conta, categoria ou fonte não pertence ao titular.");
      if (!p.title?.trim() || !validDate(p.date))
        throw Error("Preencha título e data.");
      v.entries.push({
        id: uid(),
        title: p.title,
        amount: Number(p.amount),
        kind: p.kind as "receita" | "despesa",
        date: p.date,
        categoryId: p.categoryId,
        sourceId: p.sourceId,
        accountId: p.accountId,
      });
      break;
    }
    case "edit": {
      const e = v.entries.find((e) => e.id === p.id);
      if (!e || e.paymentId)
        throw Error("Registro indisponível ou vinculado à origem empresarial.");
      integer(Number(p.amount));
      if (
        !p.title?.trim() ||
        !validDate(p.date) ||
        !v.categories.some((c) => c.id === p.categoryId && c.kind === e.kind) ||
        (p.sourceId && !v.sources.some((s) => s.id === p.sourceId))
      )
        throw Error("Dados pessoais inválidos.");
      Object.assign(e, {
        title: p.title,
        amount: Number(p.amount),
        date: p.date,
        categoryId: p.categoryId,
        sourceId: p.sourceId,
      });
      break;
    }
    case "category":
      if (!["receita", "despesa"].includes(p.kind) || !p.name?.trim())
        throw Error("Categoria inválida.");
      v.categories.push({
        id: uid(),
        name: p.name,
        kind: p.kind as "receita" | "despesa",
      });
      break;
    case "source":
      if (!p.name?.trim()) throw Error("Informe o nome.");
      v.sources.push({ id: uid(), name: p.name });
      break;
    case "account":
      if (!p.name?.trim()) throw Error("Informe o nome.");
      v.accounts.push({ id: uid(), name: p.name, opening: 0 });
      break;
    case "delete": {
      const e = v.entries.find((e) => e.id === p.id);
      if (!e || e.paymentId)
        throw Error("Registro vinculado só pode ser estornado na origem.");
      v.entries = v.entries.filter((e) => e.id !== p.id);
      break;
    }
    default:
      throw Error("Operação pessoal inválida.");
  }
}
