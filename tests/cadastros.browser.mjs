import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/login");
  await page.getByRole("button", { name: /Rafael Administrador/ }).click();
  await page.waitForURL(base + "/");
  await page.goto(base + "/configuracoes");
  await page.getByRole("button", { name: "Nova empresa", exact: true }).click();
  const company = "Empresa sem uso " + Date.now();
  await page.getByLabel("Razão social").fill(company);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const row = page
    .locator("section.panel")
    .filter({
      has: page.getByRole("heading", {
        name: "Empresas do grupo",
        exact: true,
      }),
    })
    .getByRole("row")
    .filter({ hasText: company });
  await row.getByRole("button", { name: "Remover / arquivar" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await row.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const category = "Categoria removível " + Date.now();
  await page
    .getByLabel("Categoria / subcategoria", { exact: true })
    .fill(category);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const tag = page.locator(".tags>span").filter({ hasText: category });
  await tag.getByRole("button", { name: "Remover", exact: true }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await tag.waitFor({ state: "detached" });
  await page.goto(base + "/pessoas");
  await page
    .getByRole("button", { name: "Cadastrar funcionário / prestador" })
    .click();
  const name = "Funcionário teste " + Date.now();
  await page.getByLabel("Nome completo").fill(name);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("teste@example.invalid");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".person-card")
    .filter({ hasText: name })
    .getByRole("link", { name: /Abrir perfil/ })
    .click();
  await page.waitForURL("**/pessoas/*");
  await page.getByText("teste@example.invalid", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Adicionar contratação" }).click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("CLT");
  await page.getByLabel("Cargo / função").fill("Designer de produto");
  await page.getByLabel("Valor mensal (R$)").fill("2500");
  await page.getByLabel("Jornada / carga horária").fill("40 horas semanais");
  await page
    .getByLabel("Benefícios e condições adicionais")
    .fill("Vale-alimentação demonstrativo");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Designer de produto · CLT" })
    .waitFor();
  await page.locator("input[type=file]").setInputFiles({
    name: "contrato-demo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Contrato fictício"),
  });
  await page
    .getByRole("link", { name: "contrato-demo.txt", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Remover documento", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("link", { name: "contrato-demo.txt", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Editar dados pessoais" }).click();
  await page.getByLabel("Telefone").fill("Contato fictício");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Contato fictício", { exact: true }).waitFor();
  await page.screenshot({
    path: "/tmp/cr-perfil-funcionario.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Designer de produto · CLT" })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    !(await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )),
  );
  await page.screenshot({
    path: "/tmp/cr-perfil-funcionario-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "OK: exclusão de empresa/categoria, perfil individual persistente, contratação CLT detalhada, anexo e remoção, edição e layout mobile.",
  );
} finally {
  await browser.close();
}
