import type {
  State,
  UserId,
  Entry,
  Contract,
  Composition,
  Closing,
} from "./model";
import {
  uid,
  integer,
  validateEntry,
  remaining,
  paid,
  incoming,
  monthsBetween,
  monthDate,
  dre,
  distribute,
  today,
  balance,
  allocations,
  validDate,
} from "./finance";
export function audit(s: State, actor: UserId, action: string, detail: string) {
  s.audit.unshift({
    id: uid(),
    actor,
    at: new Date().toISOString(),
    action,
    detail,
  });
}
export function addEntry(s: State, e: Entry, end?: string) {
  validateEntry(s, e);
  if (e.kind === "devolucao" && !e.advanceId)
    throw Error("Vincule a devolução ao adiantamento original.");
  if (
    ["adiantamento", "aporte", "devolucao", "distribuicao"].includes(e.kind) &&
    !e.personId
  )
    throw Error("Informe a pessoa da movimentação.");
  if (e.advanceId && e.kind !== "devolucao")
    throw Error("Somente devoluções podem vincular adiantamentos.");
  if (end && !["receita", "despesa"].includes(e.kind))
    throw Error("Recorrência disponível para receitas e despesas.");
  if (e.advanceId) {
    const advance = s.entries.find(
      (a) =>
        a.id === e.advanceId &&
        a.kind === "adiantamento" &&
        a.personId === e.personId &&
        a.companyId === e.companyId,
    );
    if (!advance) throw Error("Adiantamento original incompatível.");
    const committed = s.entries
      .filter((a) => a.advanceId === advance.id && !a.cancelled)
      .reduce((n, a) => n + a.amount, 0);
    if (committed + e.amount > paid(s, advance.id))
      throw Error("Devolução excede o adiantamento recebido.");
  }
  if (!end) {
    s.entries.push(e);
    return;
  }
  if (!validDate(end) || end < e.due)
    throw Error("Data final anterior ao vencimento.");
  const seriesId = e.seriesId || uid();
  const sequence = monthsBetween(e.due, end);

  for (const [index, month] of sequence.entries()) {
    const due = monthDate(month, Number(e.due.slice(8)));
    if (due > end) continue;
    if (s.entries.some((x) => x.seriesId === seriesId && x.due === due))
      continue;
    s.entries.push({
      ...structuredClone(e),
      id: uid(),
      seriesId,
      due,
      competence: monthDate(
        new Date(
          Date.UTC(
            Number(e.competence.slice(0, 4)),
            Number(e.competence.slice(5, 7)) - 1 + index,
            1,
          ),
        )
          .toISOString()
          .slice(0, 7),
        Number(e.competence.slice(8)),
      ),
    });
  }
}
export function settle(
  s: State,
  entryId: string,
  amount: number,
  accountId: string,
  date: string,
) {
  integer(amount);
  const e = s.entries.find((e) => e.id === entryId);
  if (!e || e.cancelled) throw Error("Lançamento indisponível.");
  if (amount > remaining(s, e)) throw Error("A baixa excede o saldo pendente.");
  if (
    !s.accounts.some((a) => a.id === accountId && a.companyId === e.companyId)
  )
    throw Error("A conta deve pertencer à empresa do lançamento.");
  if (!validDate(date) || date > today())
    throw Error("A baixa efetiva precisa ter data de hoje ou anterior.");
  const a = allocations(e);
  const weights = a.map(
    (x) =>
      x.amount -
      s.payments
        .filter((p) => p.entryId === e.id)
        .reduce((n, p) => {
          const values =
            p.allocations ??
            a.map((part, i) => ({
              ...part,
              amount: distribute(
                p.amount,
                a.map((x) => x.amount),
              )[i],
            }));
          return (
            n +
            (p.reversalOf ? -1 : 1) *
              (values.find((v) => v.projectId === x.projectId)?.amount ?? 0)
          );
        }, 0),
  );
  const parts = distribute(amount, weights);
  const p = {
    id: uid(),
    entryId,
    amount,
    accountId,
    date,
    reconciled: false,
    allocations: a.map((x, i) => ({ ...x, amount: parts[i] })),
  };
  s.payments.push(p);
  return p;
}
export function reverse(s: State, id: string, date: string) {
  const p = s.payments.find((p) => p.id === id);
  if (!p || p.reversalOf || s.payments.some((x) => x.reversalOf === id))
    throw Error("Baixa já estornada ou inexistente.");
  if (!validDate(date) || date < p.date || date > today())
    throw Error("Data de estorno inválida.");
  const entry = s.entries.find((e) => e.id === p.entryId)!;
  if (
    entry.kind === "adiantamento" &&
    s.entries
      .filter((e) => e.advanceId === entry.id)
      .reduce((n, e) => n + paid(s, e.id), 0) >
      paid(s, entry.id) - p.amount
  )
    throw Error("Estorne primeiro as devoluções vinculadas.");
  s.payments.push({ ...p, id: uid(), date, reversalOf: id, reconciled: false });
}
export function cancel(s: State, id: string) {
  const e = s.entries.find((e) => e.id === id)!;
  if (paid(s, id) !== 0) throw Error("Estorne as baixas antes de cancelar.");
  e.cancelled = true;
}
export function transfer(
  s: State,
  from: string,
  to: string,
  amount: number,
  date: string,
  nature: string,
) {
  integer(amount);
  if (
    from === to ||
    !s.accounts.some((a) => a.id === from) ||
    !s.accounts.some((a) => a.id === to)
  )
    throw Error("Selecione contas distintas.");
  if (!nature.trim() || !validDate(date) || date > today())
    throw Error("Informe data efetiva e natureza da movimentação.");
  s.transfers.push({ id: uid(), from, to, amount, date, nature });
}
export function reallocate(
  s: State,
  from: string,
  to: string,
  amount: number,
  date: string,
) {
  integer(amount);
  const a = s.projects.find((p) => p.id === from),
    b = s.projects.find((p) => p.id === to);
  if (!a || !b || a.companyId !== b.companyId || from === to)
    throw Error("Repasse exige projetos distintos do mesmo CNPJ.");
  if (!validDate(date) || date > today())
    throw Error("Informe uma data efetiva.");
  if (balance(s, { projectId: from }, date) < amount)
    throw Error("Saldo atribuído insuficiente.");
  s.reallocations.push({ id: uid(), from, to, amount, date });
}
export function generateContracts(s: State, month: string) {
  for (const c of s.contracts) {
    const due = monthDate(month, c.day);
    if (
      due < c.start ||
      (c.end && due > c.end) ||
      s.entries.some(
        (e) => e.contractId === c.id && e.competence.slice(0, 7) === month,
      )
    )
      continue;
    const project = s.projects.find((p) => p.id === c.projectId)!;
    addEntry(s, {
      id: uid(),
      companyId: project.companyId,
      projectId: c.projectId,
      kind: "despesa",
      category: c.type === "CLT" ? "Salários" : "Prestadores",
      title: `${s.people.find((p) => p.id === c.personId)!.name} • ${c.type}`,
      description: "Gerado pelo vínculo",
      amount: c.amount,
      competence: month + "-01",
      due,
      recognized: true,
      cancelled: false,
      allocations: [],
      personId: c.personId,
      contractId: c.id,
      dre: "operacional",
    });
  }
}
export function addContract(s: State, c: Contract) {
  integer(c.amount);
  if (
    !s.people.some((p) => p.id === c.personId) ||
    !s.projects.some(
      (p) => p.id === c.projectId && p.companyId === c.companyId,
    ) ||
    c.day < 1 ||
    c.day > 31 ||
    !c.start ||
    (c.end && c.end < c.start)
  )
    throw Error("Vínculo inválido.");
  if (c.previousId) {
    const previous = s.contracts.find((x) => x.id === c.previousId);
    if (
      !previous ||
      c.start <= previous.start ||
      previous.personId !== c.personId
    )
      throw Error("Revisão de vínculo inválida.");
    const d = new Date(c.start + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    previous.end = d.toISOString().slice(0, 10);
  }
  s.contracts.push(c);
}
export function addComposition(s: State, c: Composition) {
  if (
    !c.shares.length ||
    c.shares.some(
      (x) =>
        !Number.isInteger(x.bps) ||
        x.bps <= 0 ||
        (!s.people.some((p) => p.id === x.personId) && x.personId !== "grupo"),
    ) ||
    c.shares.reduce((n, x) => n + x.bps, 0) !== 10000 ||
    new Set(c.shares.map((x) => x.personId)).size !== c.shares.length ||
    !c.start
  )
    throw Error(
      "A composição precisa fechar em 100%, com participantes distintos.",
    );
  if (c.projectId === "grupo" && c.shares.some((x) => x.personId === "grupo"))
    throw Error("O grupo não pode participar de si mesmo.");
  const previous = s.compositions.filter(
    (x) => x.projectId === c.projectId && !x.end,
  );
  for (const p of previous) {
    if (c.start <= p.start)
      throw Error("A nova vigência deve começar após a anterior.");
    const d = new Date(c.start + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    p.end = d.toISOString().slice(0, 10);
  }
  s.compositions.push(c);
}
export function closeMonth(
  s: State,
  companyId: string,
  month: string,
  approved: number,
  note: string,
): Closing {
  if (
    !s.companies.some((c) => c.id === companyId) ||
    !/^\d{4}-\d{2}$/.test(month) ||
    month > today().slice(0, 7)
  )
    throw Error("Empresa ou competência inválida.");
  if (
    s.closings.some(
      (c) =>
        c.companyId === companyId &&
        c.month === month &&
        c.status === "fechado",
    )
  )
    throw Error("Esta competência já foi fechada.");
  if (!Number.isSafeInteger(approved) || approved < 0)
    throw Error("Valor aprovado inválido.");
  const previous = s.closings.filter(
    (c) => c.companyId === companyId && c.month === month,
  );
  if (previous.some((c) => c.distributionIds.some((id) => paid(s, id) > 0)))
    throw Error(
      "Estorne distribuições anteriores antes de substituir o fechamento.",
    );
  previous.forEach((c) =>
    c.distributionIds.forEach((id) => {
      const e = s.entries.find((e) => e.id === id);
      if (e) e.cancelled = true;
    }),
  );
  const date = month + "-31";
  const compositions = structuredClone(
    s.compositions.filter(
      (c) => c.start <= date && (!c.end || c.end >= month + "-01"),
    ),
  );
  const active = (id: string) =>
    compositions
      .filter((c) => c.projectId === id)
      .sort((a, b) => b.start.localeCompare(a.start))[0];
  const group = active("grupo");
  if (!group) throw Error("Composição do grupo ausente.");
  const allocations = s.projects
    .filter((p) => p.companyId === companyId)
    .map((p) => {
      const profit = dre(s, { projectId: p.id }, month + "-01", date).net;
      const composition = active(p.id);
      const external = composition
        ? composition.shares.filter((x) => x.personId !== "grupo")
        : [];
      const externalShare =
        profit > 0 && composition
          ? distribute(
              profit,
              composition.shares.map((x) => x.bps),
            ).reduce(
              (n, v, i) =>
                n +
                (external.some(
                  (x) => x.personId === composition.shares[i].personId,
                )
                  ? v
                  : 0),
              0,
            )
          : 0;
      return {
        projectId: p.id,
        profit,
        groupShare: profit - externalShare,
        externalShare,
      };
    });
  const profit = allocations.reduce((n, a) => n + a.profit, 0);
  const distributable = allocations.reduce(
    (n, a) => n + Math.max(0, a.profit),
    0,
  );
  if (approved > distributable)
    throw Error(
      "Aprovação excede lucros positivos dos projetos (regra demonstrativa).",
    );
  const ids: string[] = [];
  const project = s.projects.find((p) => p.companyId === companyId)!;
  const projectBudgets = distributable
    ? distribute(
        approved,
        allocations.map((a) => Math.max(0, a.profit)),
      )
    : allocations.map(() => 0);
  allocations.forEach((a, i) => {
    const comp = active(a.projectId);
    const shares = comp?.shares ?? [{ personId: "grupo", bps: 10000 }];
    const values = distribute(
      projectBudgets[i],
      shares.map((x) => x.bps),
    );
    shares.forEach((share, j) => {
      const recipients =
        share.personId === "grupo"
          ? group.shares
          : [{ personId: share.personId, bps: 10000 }];
      const amounts = distribute(
        values[j],
        recipients.map((x) => x.bps),
      );
      recipients.forEach((r, k) => {
        if (!amounts[k]) return;
        const id = uid();
        addEntry(s, {
          id,
          companyId,
          projectId: a.projectId || project.id,
          kind: "distribuicao",
          category: "Distribuições",
          title: `Distribuição ${month} • ${s.people.find((p) => p.id === r.personId)?.name}`,
          description: note,
          amount: amounts[k],
          competence: month + "-01",
          due: today(),
          recognized: true,
          cancelled: false,
          allocations: [],
          personId: r.personId,
          dre: "fora",
        });
        ids.push(id);
      });
    });
  });
  const c: Closing = {
    id: uid(),
    companyId,
    month,
    profit,
    approved,
    distributionIds: ids,
    compositions,
    allocations,
    status: "fechado",
    note,
  };
  s.closings.push(c);
  return c;
}
