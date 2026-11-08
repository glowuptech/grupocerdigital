import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH === ""
      ? undefined
      : process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const checks = [];
browser.on("disconnected", () => {});
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  assert.equal((await context.request.get(base + "/api/data")).status(), 401);
  assert.equal(
    (await context.request.get(base + "/api/personal")).status(),
    401,
  );
  await page.goto(base + "/projetos");
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: /Rafael Administrador/ }).click();
  await page.waitForURL(base + "/");
  await page.getByText("Seu dinheiro, em perspectiva").waitFor();
  checks.push("login e proteção de rotas");
  for (const path of [
    "lancamentos",
    "contas",
    "fluxo",
    "dre",
    "pessoas",
    "socios",
    "fechamento",
    "configuracoes",
    "pessoal",
  ]) {
    await page.goto(base + "/" + path);
    await page.locator(".main-content h1").waitFor();
    await page.locator(".loading").waitFor({ state: "hidden" });
    assert.equal(
      await page.getByText("Internal Server Error", { exact: true }).count(),
      0,
    );
  }
  checks.push("navegação em todos os módulos");
  await page.goto(base + "/projetos");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  const name = "Projeto de teste " + Date.now();
  await page.getByLabel("Nome do projeto").fill(name);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .click();
  await page.getByRole("heading", { name: name + ".", exact: true }).waitFor();
  checks.push("criação e página própria do projeto");
  await page.goto(base + "/lancamentos");
  await page
    .getByRole("button", { name: "Novo lançamento", exact: true })
    .first()
    .click();
  const transactionTitle = "Parcial de teste " + Date.now();
  await page.getByLabel("Título", { exact: true }).fill(transactionTitle);
  await page.getByLabel("Valor (R$)", { exact: true }).fill("101,01");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const row = page.getByRole("row").filter({ hasText: transactionTitle });
  await row.getByRole("button", { name: "Baixar", exact: true }).click();
  await page.getByLabel("Valor da baixa (R$)").fill("40");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await row.getByText("Parcial", { exact: true }).waitFor();
  assert.match(await row.innerText(), /61,01/);
  checks.push("lançamento e baixa parcial pela interface");
  const post = async (request, path, type, payload) => {
    const r = await request.post(base + path, { data: { type, payload } });
    assert.ok(r.ok(), await r.text());
    return r.json();
  };
  await post(context.request, "/api/personal", "category", {
    name: "Categoria só Rafael " + Date.now(),
    kind: "receita",
  });
  await post(context.request, "/api/personal", "source", {
    name: "Fonte só Rafael " + Date.now(),
  });
  let p = await (await context.request.get(base + "/api/personal")).json();
  const privateCategory = p.categories.at(-1),
    privateSource = p.sources.at(-1);
  await post(context.request, "/api/personal", "entry", {
    title: "Registro privado de Rafael",
    amount: "12345",
    kind: "receita",
    date: new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    }),
    accountId: p.accounts[0].id,
    categoryId: privateCategory.id,
    sourceId: privateSource.id,
  });
  const other = await browser.newContext();
  assert.ok(
    (
      await other.request.post(base + "/api/session", {
        data: { user: "claudecir" },
      })
    ).ok(),
  );
  const data = await (
    await other.request.get(base + "/api/personal?owner=rafael")
  ).json();
  assert.ok(!data.categories.some((c) => c.id === privateCategory.id));
  assert.ok(!data.sources.some((s) => s.id === privateSource.id));
  assert.ok(
    !data.entries.some((e) => e.title === "Registro privado de Rafael"),
  );
  const bad = await other.request.post(base + "/api/personal", {
    data: {
      type: "entry",
      payload: {
        owner: "rafael",
        title: "Intrusão",
        amount: "100",
        kind: "receita",
        date: "2026-11-01",
        accountId: data.accounts[0].id,
        categoryId: privateCategory.id,
        sourceId: privateSource.id,
      },
    },
  });
  assert.equal(bad.status(), 400);
  const badEdit = await other.request.post(base + "/api/personal", {
    data: {
      type: "edit",
      payload: {
        owner: "rafael",
        id: p.entries[0]?.id || "inexistente",
        title: "intrusão",
        amount: "100",
        date: "2026-11-01",
        categoryId: privateCategory.id,
      },
    },
  });
  assert.equal(badEdit.status(), 400);
  checks.push("isolamento pessoal via operações HTTP diretas");
  await page.goto(base + "/");
  await page.getByText("Seu dinheiro, em perspectiva").waitFor();
  await page.screenshot({
    path: "/tmp/cr-dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/cr-dashboard-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("link", { name: "Lançamentos", exact: false })
    .first()
    .click();
  await page.waitForURL("**/lancamentos");
  checks.push("layout mobile e navegação");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Sair da sessão" }).click();
  await page.waitForURL("**/login");
  assert.equal((await context.request.get(base + "/api/data")).status(), 401);
  checks.push("saída e invalidação de acesso");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
  await other.close();
  await context.close();
} finally {
  await browser.close();
}
