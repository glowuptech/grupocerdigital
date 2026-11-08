import type {
  State,
  Entry,
  Scope,
  Payment,
  Allocation,
  DreClass,
} from "./model";
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T12:00:00Z");
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function dateLabel(s: string) {
  return s ? s.split("-").reverse().join("/") : "—";
}
export function cents(value: string) {
  const v = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v))
    throw Error("Informe um valor positivo com até duas casas decimais.");
  const [a, b = ""] = v.split(".");
  const result = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0)
    throw Error("Valor inválido.");
  return result;
}
export function integer(n: number) {
  if (!Number.isSafeInteger(n) || n <= 0)
    throw Error("O valor precisa ser um número inteiro positivo de centavos.");
}
export const uid = () => crypto.randomUUID();
export const incoming = (e: Entry) =>
  ["receita", "adiantamento", "aporte"].includes(e.kind);
export function paid(s: State, id: string) {
  return s.payments
    .filter((p) => p.entryId === id)
    .reduce((n, p) => n + (p.reversalOf ? -p.amount : p.amount), 0);
}
export function remaining(s: State, e: Entry) {
  return e.amount - paid(s, e.id);
}
export function status(s: State, e: Entry) {
  return e.cancelled
    ? "Cancelado"
    : remaining(s, e) === 0
      ? "Efetivado"
      : paid(s, e.id) > 0
        ? "Parcial"
        : e.due < today()
          ? "Vencido"
          : "Pendente";
}
// Largest remainder: ties follow the order supplied, so every cent is assigned once.
export function distribute(amount: number, weights: number[]): number[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !weights.length ||
    weights.some((w) => !Number.isSafeInteger(w) || w < 0)
  )
    throw Error("Rateio inválido.");
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) throw Error("Rateio sem valor.");
  const parts = weights.map((w) =>
    Number((BigInt(amount) * BigInt(w)) / BigInt(total)),
  );
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, r: (BigInt(amount) * BigInt(w)) % BigInt(total) }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of order) {
    if (rest-- <= 0) break;
    parts[i]++;
  }
  return parts;
}
export function allocations(e: Entry): Allocation[] {
  return e.allocations.length
    ? e.allocations
    : [{ projectId: e.projectId, amount: e.amount }];
}
export function entryAmount(e: Entry, scope: Scope = {}) {
  if (scope.companyId && e.companyId !== scope.companyId) return 0;
  return scope.projectId
    ? (allocations(e).find((a) => a.projectId === scope.projectId)?.amount ?? 0)
    : e.amount;
}
export function paymentAmount(s: State, p: Payment, scope: Scope = {}) {
  const e = s.entries.find((x) => x.id === p.entryId)!;
  if (scope.companyId && e.companyId !== scope.companyId) return 0;
  const a =
    p.allocations ??
    allocations(e).map((x, i) => ({
      ...x,
      amount: distribute(
        p.amount,
        allocations(e).map((x) => x.amount),
      )[i],
    }));
  const n = scope.projectId
    ? (a.find((x) => x.projectId === scope.projectId)?.amount ?? 0)
    : p.amount;
  return (incoming(e) ? 1 : -1) * (p.reversalOf ? -1 : 1) * n;
}
export function balance(s: State, scope: Scope = {}, date = today()) {
  let total = scope.projectId
    ? (s.projects.find((p) => p.id === scope.projectId)?.opening ?? 0)
    : s.accounts
        .filter((a) => !scope.companyId || a.companyId === scope.companyId)
        .reduce((n, a) => n + a.opening, 0);
  total += s.payments
    .filter((p) => p.date <= date)
    .reduce((n, p) => n + paymentAmount(s, p, scope), 0);
  if (scope.projectId)
    total += s.reallocations
      .filter((r) => r.date <= date)
      .reduce(
        (n, r) =>
          n +
          (r.to === scope.projectId ? r.amount : 0) -
          (r.from === scope.projectId ? r.amount : 0),
        0,
      );
  else if (scope.companyId)
    total += s.transfers
      .filter((t) => t.date <= date)
      .reduce(
        (n, t) =>
          n +
          (s.accounts.find((a) => a.id === t.to)?.companyId === scope.companyId
            ? t.amount
            : 0) -
          (s.accounts.find((a) => a.id === t.from)?.companyId ===
          scope.companyId
            ? t.amount
            : 0),
        0,
      );
  return total;
}
export function accountBalance(s: State, id: string, date = today()) {
  const a = s.accounts.find((a) => a.id === id)!;
  return (
    a.opening +
    s.payments
      .filter((p) => p.accountId === id && p.date <= date)
      .reduce((n, p) => n + paymentAmount(s, p), 0) +
    s.transfers
      .filter((t) => t.date <= date)
      .reduce(
        (n, t) =>
          n + (t.to === id ? t.amount : 0) - (t.from === id ? t.amount : 0),
        0,
      )
  );
}
export function totals(s: State, scope: Scope, from: string, to: string) {
  return s.payments
    .filter((p) => p.date >= from && p.date <= to)
    .reduce(
      (r, p) => {
        const n = paymentAmount(s, p, scope);
        r[n >= 0 ? "received" : "spent"] += Math.abs(n);
        return r;
      },
      { received: 0, spent: 0 },
    );
}
export function dre(s: State, scope: Scope, from: string, to: string) {
  const r: Record<DreClass, number> = {
    receita: 0,
    deducao: 0,
    custo: 0,
    operacional: 0,
    financeiro: 0,
    tributo: 0,
    fora: 0,
  };
  s.entries
    .filter(
      (e) =>
        e.recognized &&
        !e.cancelled &&
        e.competence >= from &&
        e.competence <= to,
    )
    .forEach(
      (e) =>
        (r[e.dre] +=
          entryAmount(e, scope) *
          (e.dre === "financeiro" ? (incoming(e) ? 1 : -1) : 1)),
    );
  return {
    ...r,
    net:
      r.receita -
      r.deducao -
      r.custo -
      r.operacional +
      r.financeiro -
      r.tributo,
  };
}
export function reserves(s: State, scope: Scope) {
  const end = addDays(today(), 30);
  const reserve =
    s.projects
      .filter(
        (p) =>
          (!scope.companyId || p.companyId === scope.companyId) &&
          (!scope.projectId || p.id === scope.projectId),
      )
      .reduce((n, p) => n + p.reserve, 0) +
    (scope.projectId
      ? 0
      : Object.entries(s.generalReserves)
          .filter(([id]) => !scope.companyId || id === scope.companyId)
          .reduce((n, [, v]) => n + v, 0));
  const need = s.entries
    .filter((e) => !incoming(e) && !e.cancelled && e.due <= end)
    .reduce(
      (n, e) =>
        n +
        (e.amount
          ? Math.round((remaining(s, e) * entryAmount(e, scope)) / e.amount)
          : 0),
      0,
    );
  return {
    reserve,
    need,
    gap: Math.max(0, need - reserve),
    free: balance(s, scope) - reserve - Math.max(0, need - reserve),
  };
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function monthDate(month: string, day: number) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, "0")}`;
}
export function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  let m = start.slice(0, 7);
  while (m <= end.slice(0, 7)) {
    months.push(m);
    const [y, n] = m.split("-").map(Number);
    m = `${n === 12 ? y + 1 : y}-${String(n === 12 ? 1 : n + 1).padStart(2, "0")}`;
    if (months.length > 240) throw Error("Limite de recorrência: 240 meses.");
  }
  return months;
}
export function dailyFlow(s: State, scope: Scope, month: string) {
  const last = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  return Array.from({ length: last }, (_, i) => {
    const date = monthDate(month, i + 1);
    const previous = addDays(date, -1);
    const t = totals(s, scope, date, date);
    const initial = balance(s, scope, previous);
    return {
      date,
      initial,
      ...t,
      final: balance(s, scope, date),
      transfers: balance(s, scope, date) - initial - t.received + t.spent,
    };
  });
}
export function validateEntry(s: State, e: Entry) {
  integer(e.amount);
  if (
    ![
      "receita",
      "despesa",
      "distribuicao",
      "adiantamento",
      "aporte",
      "devolucao",
    ].includes(e.kind) ||
    ![
      "receita",
      "deducao",
      "custo",
      "operacional",
      "financeiro",
      "tributo",
      "fora",
    ].includes(e.dre) ||
    typeof e.recognized !== "boolean" ||
    !Array.isArray(e.allocations) ||
    !s.categories.includes(e.category) ||
    (e.personId && !s.people.some((p) => p.id === e.personId))
  )
    throw Error("Tipo, categoria, pessoa ou classificação inválidos.");
  if (
    (e.kind === "receita" && !["receita", "financeiro"].includes(e.dre)) ||
    (e.kind === "despesa" && e.dre === "receita")
  )
    throw Error("Classificação incompatível com a natureza do lançamento.");
  if (
    !s.companies.some((c) => c.id === e.companyId) ||
    !s.projects.some((p) => p.id === e.projectId && p.companyId === e.companyId)
  )
    throw Error("Empresa e projeto incompatíveis.");
  if (!e.title.trim() || !validDate(e.due) || !validDate(e.competence))
    throw Error("Preencha título e datas.");
  const a = allocations(e);
  if (
    a.reduce((n, x) => n + x.amount, 0) !== e.amount ||
    a.some(
      (x) =>
        x.amount <= 0 ||
        !Number.isSafeInteger(x.amount) ||
        !s.projects.some(
          (p) => p.id === x.projectId && p.companyId === e.companyId,
        ),
    ) ||
    new Set(a.map((x) => x.projectId)).size !== a.length
  )
    throw Error(
      "O rateio precisa fechar em centavos, em projetos distintos da mesma empresa.",
    );
  if (!["receita", "despesa"].includes(e.kind) && e.dre !== "fora")
    throw Error("Movimentação patrimonial deve ficar fora da DRE.");
}
