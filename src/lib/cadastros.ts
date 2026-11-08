import type { State } from "./model";
import { validDate, today } from "./finance";
export function companyUsed(s: State, id: string) {
  return (
    s.projects.some((p) => p.companyId === id) ||
    s.accounts.some((a) => a.companyId === id) ||
    s.entries.some((e) => e.companyId === id) ||
    s.contracts.some((c) => c.companyId === id) ||
    s.closings.some((c) => c.companyId === id) ||
    Boolean(s.generalReserves[id])
  );
}
export function personUsed(s: State, id: string) {
  return (
    s.contracts.some((c) => c.personId === id) ||
    s.entries.some((e) => e.personId === id) ||
    s.compositions.some((c) => c.shares.some((p) => p.personId === id)) ||
    s.closings.some((c) =>
      c.compositions.some((comp) => comp.shares.some((p) => p.personId === id)),
    ) ||
    s.people.some((p) => p.id === id && p.userId)
  );
}
export function removeCompany(s: State, id: string) {
  const c = s.companies.find((c) => c.id === id);
  if (!c) throw Error("Empresa não encontrada.");
  if (companyUsed(s, id)) c.archived = true;
  else {
    s.companies = s.companies.filter((c) => c.id !== id);
    delete s.generalReserves[id];
  }
}
export function removeCategory(s: State, name: string) {
  if (
    (name === "Salários" || name === "Prestadores") &&
    s.contracts.some(
      (c) =>
        (name === "Salários" ? c.type === "CLT" : c.type === "PJ") &&
        (!c.end || c.end >= today()),
    )
  )
    throw Error(
      "Esta categoria gera pagamentos de contratações vigentes. Encerre essas contratações antes de removê-la.",
    );
  if (!s.categories.includes(name)) throw Error("Categoria não encontrada.");
  if (s.entries.some((e) => e.category === name)) {
    s.archivedCategories = [
      ...new Set([...(s.archivedCategories ?? []), name]),
    ];
  } else {
    s.categories = s.categories.filter((c) => c !== name);
    s.archivedCategories = (s.archivedCategories ?? []).filter(
      (c) => c !== name,
    );
  }
}
export function removePerson(s: State, id: string) {
  const p = s.people.find((p) => p.id === id);
  if (!p) throw Error("Pessoa não encontrada.");
  if (
    s.contracts.some((c) => c.personId === id && (!c.end || c.end >= today()))
  )
    throw Error("Encerre as contratações vigentes antes de arquivar o perfil.");
  if (personUsed(s, id)) p.archived = true;
  else s.people = s.people.filter((p) => p.id !== id);
}
export function endContract(s: State, id: string, end: string, reason: string) {
  const c = s.contracts.find((c) => c.id === id);
  if (!c || !validDate(end) || end < c.start || !reason.trim())
    throw Error("Informe uma data de desligamento válida e o motivo.");
  if (c.end && c.end < today())
    throw Error("Esta condição já terminou; seu histórico foi preservado.");
  c.end = end;
  c.terminationReason = reason;
}
