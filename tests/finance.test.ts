import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, personalSeed } from "../src/lib/seed";
import {
  balance,
  dre,
  paid,
  remaining,
  totals,
  distribute,
  today,
  dailyFlow,
  accountBalance,
  paymentAmount,
} from "../src/lib/finance";
import {
  addEntry,
  settle,
  reverse,
  transfer,
  reallocate,
  generateContracts,
  addComposition,
  closeMonth,
} from "../src/lib/operations";
import {
  personalView,
  personalCommand,
  syncPersonal,
} from "../src/lib/personal";
const current = today(),
  month = current.slice(0, 7);
test("recorrência, baixa parcial em outro mês e competência independente", () => {
  const s = seed();
  s.entries = [];
  s.payments = [];
  addEntry(
    s,
    {
      id: "rec",
      companyId: "c1",
      projectId: "p3",
      kind: "despesa",
      category: "Servidor",
      title: "Servidor recorrente",
      description: "",
      amount: 10001,
      competence: "2026-01-01",
      due: "2026-01-31",
      recognized: true,
      cancelled: false,
      allocations: [],
      dre: "custo",
      seriesId: "serie",
    },
    "2026-03-31",
  );
  assert.equal(s.entries.length, 3);
  assert.equal(s.entries[1].due, "2026-02-28");
  addEntry(s, { ...s.entries[0], id: "again" }, "2026-03-31");
  assert.equal(s.entries.length, 3);
  const e = s.entries[0];
  settle(s, e.id, 4000, "a1", "2026-02-10");
  assert.equal(remaining(s, e), 6001);
  assert.equal(dre(s, {}, "2026-01-01", "2026-01-31").net, -10001);
  assert.equal(totals(s, {}, "2026-01-01", "2026-01-31").spent, 0);
  assert.equal(totals(s, {}, "2026-02-01", "2026-02-28").spent, 4000);
});
test("transferências entre CNPJs e contas não inflam o consolidado ou DRE", () => {
  const s = seed();
  const before = balance(s, {}),
    a = balance(s, { companyId: "c1" }),
    b = balance(s, { companyId: "c2" }),
    d = dre(s, {}, month + "-01", month + "-31").net,
    t = totals(s, {}, month + "-01", current);
  transfer(s, "a1", "a3", 12345, current, "Mútuo");
  assert.equal(balance(s, {}), before);
  assert.equal(balance(s, { companyId: "c1" }), a - 12345);
  assert.equal(balance(s, { companyId: "c2" }), b + 12345);
  assert.equal(dre(s, {}, month + "-01", month + "-31").net, d);
  assert.deepEqual(totals(s, {}, month + "-01", current), t);
  assert.equal(
    s.accounts.reduce((n, a) => n + accountBalance(s, a.id), 0),
    balance(s, {}),
  );
});
test("rateio em centavos e caixa parcial contam uma vez no grupo", () => {
  const s = seed();
  const a = distribute(10001, [50, 50]);
  assert.deepEqual(a, [5001, 5000]);
  addEntry(s, {
    id: "rateio",
    companyId: "c1",
    projectId: "p1",
    kind: "despesa",
    category: "Tráfego pago",
    title: "Rateio",
    description: "",
    amount: 10001,
    competence: current,
    due: current,
    recognized: true,
    cancelled: false,
    allocations: [
      { projectId: "p1", amount: a[0] },
      { projectId: "p6", amount: a[1] },
    ],
    dre: "operacional",
  });
  const p = settle(s, "rateio", 3333, "a1", current);
  assert.equal(paymentAmount(s, p), -3333);
  assert.equal(
    paymentAmount(s, p, { projectId: "p1" }) +
      paymentAmount(s, p, { projectId: "p6" }),
    -3333,
  );
  assert.throws(() => settle(s, "rateio", 99999, "a1", current));
  assert.throws(() => settle(s, "rateio", 100, "a3", current));
});
test("repasse muda atribuição e preserva saldo consolidado", () => {
  const s = seed();
  const before = balance(s, {}),
    a = balance(s, { projectId: "p1" }),
    b = balance(s, { projectId: "p2" });
  reallocate(s, "p1", "p2", 10000, current);
  assert.equal(balance(s, { projectId: "p1" }), a - 10000);
  assert.equal(balance(s, { projectId: "p2" }), b + 10000);
  assert.equal(balance(s, {}), before);
  assert.throws(() => reallocate(s, "p1", "p4", 100, current));
});
test("uma pessoa com dois vínculos: geração idempotente, histórico separado", () => {
  const s = seed();
  generateContracts(s, month);
  generateContracts(s, month);
  assert.equal(
    s.entries.filter(
      (e) => e.contractId === "ct1" && e.competence.slice(0, 7) === month,
    ).length,
    1,
  );
  assert.equal(
    s.entries.filter(
      (e) => e.contractId === "ct2" && e.competence.slice(0, 7) === month,
    ).length,
    1,
  );
  assert.equal(
    s.entries.filter((e) => e.personId === "rafael-p" && e.contractId).length,
    2,
  );
  assert.equal(paid(s, "e12") - paid(s, "e13"), 350000);
});
test("pessoal: isolamento por titular, rejeição de categoria alheia e duplicação de baixa", () => {
  const s = seed(),
    data = {
      rafael: personalSeed("rafael"),
      claudecir: personalSeed("claudecir"),
    };
  syncPersonal(s, data);
  const count = data.rafael.entries.length;
  syncPersonal(s, data);
  assert.equal(data.rafael.entries.length, count);
  personalCommand(data, "rafael", "category", {
    name: "Privada Rafael",
    kind: "receita",
  });
  const id = data.rafael.categories.at(-1)!.id;
  assert.ok(
    !personalView(data, "claudecir").categories.some((c) => c.id === id),
  );
  assert.throws(() =>
    personalCommand(data, "claudecir", "entry", {
      amount: "100",
      title: "tentativa",
      date: current,
      kind: "receita",
      accountId: "personal-main",
      categoryId: id,
      sourceId: "",
    }),
  );
  const view = personalView(data, "rafael");
  view.sources = [];
  assert.notEqual(data.rafael.sources.length, 0);
  reverse(s, "b5", current);
  syncPersonal(s, data);
  syncPersonal(s, data);
  assert.equal(
    data.rafael.entries.filter((e) => e.paymentId === s.payments.at(-1)!.id)
      .length,
    1,
  );
  assert.equal(data.rafael.entries.at(-1)!.kind, "despesa");
  assert.equal(data.claudecir.entries.length, 0);
});
test("fluxo diário inclui dias sem movimento e saldos batem com contas", () => {
  const s = seed(),
    rows = dailyFlow(s, {}, month);
  assert.equal(
    rows.length,
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(),
  );
  for (const r of rows)
    assert.equal(r.initial + r.received - r.spent + r.transfers, r.final);
});
test("fechamento preserva composição e separa aprovação de pagamento", () => {
  const s = seed();
  const before = balance(s, {});
  const close = closeMonth(s, "c1", month, 10000, "Conferido");
  assert.equal(balance(s, {}), before);
  assert.equal(
    close.distributionIds.reduce(
      (n, id) => n + s.entries.find((e) => e.id === id)!.amount,
      0,
    ),
    10000,
  );
  assert.ok(
    close.compositions.some((c) =>
      c.shares.some((x) => x.personId === "grupo" && x.bps === 9000),
    ),
  );
  const original = structuredClone(close.compositions);
  addComposition(s, {
    id: "new",
    projectId: "grupo",
    start: "2027-01-01",
    end: "",
    shares: [
      { personId: "rafael-p", bps: 4000 },
      { personId: "claudecir-p", bps: 6000 },
    ],
  });
  assert.deepEqual(close.compositions, original);
  assert.throws(() => closeMonth(s, "c1", month, 100, "duplicado"));
});

test("parcelas de rateio quitadas em várias baixas fecham exatamente e estornam a origem", () => {
  const s = seed();
  s.entries = [];
  s.payments = [];
  addEntry(s, {
    id: "split",
    companyId: "c1",
    projectId: "p1",
    kind: "despesa",
    category: "Tráfego pago",
    title: "Várias parcelas",
    description: "",
    amount: 101,
    competence: current,
    due: current,
    recognized: true,
    cancelled: false,
    allocations: [
      { projectId: "p1", amount: 34 },
      { projectId: "p2", amount: 34 },
      { projectId: "p6", amount: 33 },
    ],
    dre: "operacional",
  });
  for (let i = 0; i < 101; i++) settle(s, "split", 1, "a1", current);
  assert.equal(remaining(s, s.entries[0]), 0);
  for (const [id, total] of [
    ["p1", 34],
    ["p2", 34],
    ["p6", 33],
  ] as const)
    assert.equal(
      s.payments.reduce(
        (n, p) => n - paymentAmount(s, p, { projectId: id }),
        0,
      ),
      total,
    );
  const last = s.payments.at(-1)!;
  reverse(s, last.id, current);
  assert.equal(remaining(s, s.entries[0]), 1);
  assert.deepEqual(s.payments.at(-1)!.allocations, last.allocations);
});
test("cada baixa parcial gera entrada pessoal única; estorno não apaga o histórico", () => {
  const s = seed(),
    data = {
      rafael: personalSeed("rafael"),
      claudecir: personalSeed("claudecir"),
    };
  const payment = settle(s, "e7", 10000, "a1", current);
  syncPersonal(s, data);
  syncPersonal(s, data);
  assert.equal(
    data.rafael.entries.filter((e) => e.paymentId === payment.id).length,
    1,
  );
  assert.equal(
    data.rafael.entries.find((e) => e.paymentId === payment.id)!.amount,
    10000,
  );
  assert.equal(data.claudecir.entries.length, 0);
  reverse(s, payment.id, current);
  syncPersonal(s, data);
  assert.equal(
    data.rafael.entries.filter((e) => e.paymentId === payment.id).length,
    1,
  );
  assert.equal(data.rafael.entries.at(-1)!.kind, "despesa");
});
test("devoluções ficam limitadas ao adiantamento efetivamente recebido", () => {
  const s = seed();
  const original = s.entries.find((e) => e.id === "e13")!;
  assert.throws(() =>
    addEntry(s, { ...original, id: "excess", amount: 400000 }),
  );
  const before = dre(s, {}, month + "-01", month + "-31").net;
  addEntry(s, { ...original, id: "partial-return", amount: 100000 });
  settle(s, "partial-return", 100000, "a1", current);
  assert.equal(
    paid(s, "e12") -
      s.entries
        .filter((e) => e.advanceId === "e12")
        .reduce((n, e) => n + paid(s, e.id), 0),
    250000,
  );
  assert.equal(dre(s, {}, month + "-01", month + "-31").net, before);
});
test("datas inexistentes e tipo financeiro indevido são rejeitados", () => {
  const s = seed(),
    e = { ...s.entries[0], id: "invalid", due: "2026-02-31" };
  assert.throws(() => addEntry(s, e));
  assert.throws(() =>
    addEntry(s, { ...s.entries[0], id: "bad-kind", kind: "invalido" as never }),
  );
  assert.throws(() => settle(s, "e6", 100, "a2", "2026-02-31"));
});

test("recorrência mantém o intervalo original entre competência e vencimento", () => {
  const s = seed();
  s.entries = [];
  s.payments = [];
  addEntry(
    s,
    {
      id: "offset",
      companyId: "c1",
      projectId: "p3",
      kind: "despesa",
      category: "Servidor",
      title: "Competência anterior",
      description: "",
      amount: 50000,
      competence: "2026-01-01",
      due: "2026-02-10",
      recognized: true,
      cancelled: false,
      allocations: [],
      dre: "custo",
    },
    "2026-04-10",
  );
  assert.deepEqual(
    s.entries.map((e) => [e.competence, e.due]),
    [
      ["2026-01-01", "2026-02-10"],
      ["2026-02-01", "2026-03-10"],
      ["2026-03-01", "2026-04-10"],
    ],
  );
});
test("adiantamento com devolução efetivada exige estornar a devolução antes da origem", () => {
  const s = seed();
  assert.throws(() => reverse(s, "b7", current));
  reverse(s, "b8", current);
  reverse(s, "b7", current);
  assert.equal(paid(s, "e12"), 0);
  assert.equal(paid(s, "e13"), 0);
  assert.throws(() =>
    addEntry(s, {
      ...s.entries.find((e) => e.id === "e13")!,
      id: "unlinked",
      advanceId: undefined,
    }),
  );
});

test("cadastro já pago registra lançamento e pagamento com a mesma competência", async () => {
  const { command } = await import("../src/lib/commands");
  const s = seed();
  command(s, "rafael", "entry", {
    companyId: "c1",
    projectId: "p1",
    kind: "despesa",
    category: "Administrativo",
    title: "Pago no cadastro",
    description: "",
    amount: 12000,
    competence: current,
    due: current,
    recognized: true,
    allocations: [],
    dre: "operacional",
    paymentState: "paid",
    paidAccount: "a1",
    paidDate: current,
  });
  const e = s.entries.at(-1)!;
  assert.equal(paid(s, e.id), 12000);
  assert.equal(remaining(s, e), 0);
  assert.equal(s.payments.at(-1)!.entryId, e.id);
});
