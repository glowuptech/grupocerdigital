import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/seed";
import { command } from "../src/lib/commands";
import { addContract, generateContracts } from "../src/lib/operations";
import { balance, dre, today, addDays } from "../src/lib/finance";
const date = today(),
  month = date.slice(0, 7);
test("empresa sem uso é excluída; empresa utilizada é arquivada sem apagar saldos ou histórico", () => {
  const s = seed(),
    before = balance(s, {}),
    n = s.entries.length;
  command(s, "rafael", "company", {
    name: "Sem uso",
    tradeName: "Teste",
    cnpj: "",
  });
  const id = s.companies.at(-1)!.id;
  command(s, "rafael", "remove-company", { id });
  assert.ok(!s.companies.some((c) => c.id === id));
  command(s, "rafael", "remove-company", { id: "c1" });
  assert.ok(s.companies[0].archived);
  assert.equal(balance(s, {}), before);
  assert.equal(s.entries.length, n);
  assert.throws(() =>
    command(s, "rafael", "account", {
      companyId: "c1",
      name: "Nova",
      opening: 0,
    }),
  );
  command(s, "rafael", "restore-company", { id: "c1" });
  assert.equal(s.companies[0].archived, false);
});
test("categoria usada é arquivada, restauração preserva a DRE e categoria sem uso é removida", () => {
  const s = seed(),
    before = dre(s, {}, month + "-01", month + "-31").net;
  command(s, "rafael", "remove-category", { name: "Servidor" });
  assert.ok(s.archivedCategories?.includes("Servidor"));
  assert.equal(dre(s, {}, month + "-01", month + "-31").net, before);
  command(s, "rafael", "restore-category", { name: "Servidor" });
  assert.ok(!s.archivedCategories?.includes("Servidor"));
  command(s, "rafael", "category", { name: "Descartável" });
  command(s, "rafael", "remove-category", { name: "Descartável" });
  assert.ok(!s.categories.includes("Descartável"));
  assert.throws(() =>
    command(s, "rafael", "remove-category", { name: "Salários" }),
  );
});
test("remover piso ou documento mantém a contratação e o dinheiro intactos", () => {
  const s = seed(),
    before = balance(s, {});
  command(s, "rafael", "reserve", { projectId: "p1", amount: 0 });
  assert.equal(s.projects[0].reserve, 0);
  command(s, "rafael", "attachment", {
    id: "ct1",
    name: "Contrato.txt",
    data: "data:text/plain;base64,VGVzdGU=",
  });
  command(s, "rafael", "remove-attachment", {
    id: "ct1",
    index: 0,
    name: "Contrato.txt",
  });
  assert.equal(s.contracts[0].attachments.length, 0);
  assert.equal(balance(s, {}), before);
  assert.ok(s.audit.some((a) => a.action === "remove-attachment"));
  assert.throws(() =>
    command(s, "rafael", "remove-attachment", {
      id: "ct1",
      index: 0,
      name: "Contrato.txt",
    }),
  );
});
test("perfil editável mantém vínculo de usuário; exclusão não perde pagamentos", () => {
  const s = seed();
  command(s, "rafael", "person-edit", {
    id: "rafael-p",
    name: "Rafael Demo",
    cpf: "Demo",
    rg: "Demo",
    email: "rafael@example.invalid",
    phone: "Fictício",
    userId: "claudecir",
  });
  assert.equal(s.people[0].userId, "rafael");
  assert.equal(s.people[0].email, "rafael@example.invalid");
  assert.throws(() =>
    command(s, "rafael", "remove-person", { id: "rafael-p" }),
  );
  command(s, "rafael", "person", { name: "Sem histórico" });
  const id = s.people.at(-1)!.id;
  command(s, "rafael", "remove-person", { id });
  assert.ok(!s.people.some((p) => p.id === id));
});
test("reajuste preserva contrato e documentos anteriores; término impede geração futura", () => {
  const s = seed(),
    old = s.contracts[0],
    start = addDays(date, 1);
  old.attachments = [
    { name: "original.txt", data: "data:text/plain;base64,VGVzdGU=" },
  ];
  addContract(s, {
    ...old,
    id: "revised",
    previousId: old.id,
    start,
    end: "",
    amount: 700000,
    role: "Gestor novo",
    attachments: [],
  });
  assert.equal(old.amount, 600000);
  assert.equal(old.attachments.length, 1);
  assert.equal(old.end, date);
  command(s, "rafael", "end-contract", {
    id: "revised",
    end: start,
    reason: "Término de demonstração",
  });
  generateContracts(s, "2027-01");
  assert.equal(s.entries.filter((e) => e.contractId === "revised").length, 0);
  assert.equal(
    s.contracts.at(-1)!.terminationReason,
    "Término de demonstração",
  );
  assert.throws(() =>
    command(s, "rafael", "end-contract", {
      id: "revised",
      end: "2026-02-31",
      reason: "Inválido",
    }),
  );
});

test("geração pelo perfil afeta apenas a pessoa selecionada e é idempotente", () => {
  const s = seed();
  s.contracts.push({ ...s.contracts[0], id: "other", personId: "claudecir-p" });
  s.entries = [];
  s.payments = [];
  generateContracts(s, month, "rafael-p");
  generateContracts(s, month, "rafael-p");
  assert.equal(s.entries.length, 2);
  assert.ok(s.entries.every((e) => e.personId === "rafael-p"));
  assert.throws(() => generateContracts(s, "2026-13", "rafael-p"));
});
