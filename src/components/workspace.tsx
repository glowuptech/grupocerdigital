"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  ChartPie,
  Layers,
  Users,
  Handshake,
  ClipboardCheck,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  LogOut,
  ChevronRight,
  Search,
  Menu,
  X,
  Check,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Download,
  Ellipsis,
  Landmark,
} from "lucide-react";
import type {
  State,
  UserId,
  Scope,
  Entry,
  Personal,
  Kind,
  DreClass,
} from "@/lib/model";
import {
  money,
  today,
  dateLabel,
  cents,
  uid,
  balance,
  accountBalance,
  totals,
  dre,
  reserves,
  status,
  remaining,
  paid,
  entryAmount,
  paymentAmount,
  incoming,
  dailyFlow,
  monthsBetween,
  monthDate,
  distribute,
  addDays,
} from "@/lib/finance";
import { Button } from "./ui/button";
import { FormModal, type FormSpec, type Field } from "./forms";
const nav = [
  ["dashboard", "Visão geral", LayoutDashboard],
  ["lancamentos", "Lançamentos", ArrowLeftRight],
  ["contas", "Contas", Wallet],
  ["fluxo", "Fluxo de caixa", ChartNoAxesCombined],
  ["dre", "DRE gerencial", ChartPie],
  ["projetos", "Projetos", Layers],
  ["pessoas", "Pessoas", Users],
  ["socios", "Sócios", Handshake],
  ["fechamento", "Fechamento", ClipboardCheck],
  ["configuracoes", "Configurações", Settings],
] as const;
const option = (value: string, label: string) => ({ value, label });
const field = (
  name: string,
  label: string,
  value: string | number = "",
  type = "text",
  extra: Partial<Field> = {},
): Field => ({ name, label, value, type, ...extra });
const select = (
  name: string,
  label: string,
  options: { value: string; label: string }[],
  value?: string,
): Field => ({
  name,
  label,
  options,
  value,
  required: !options.some((o) => o.value === ""),
});
const moneyField = (name = "amount", label = "Valor (R$)", value = "") =>
  field(name, label, value, "text", {
    hint: "Ex.: 1.250,00 não é aceito. Use 1250,00.",
  });
const dateField = (name = "date", label = "Data efetiva", value = today()) =>
  field(name, label, value, "date");
function Metric({
  label,
  value,
  detail,
  tone = "purple",
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={
        "metric " +
        tone +
        (label.includes("Impostos")
          ? " metric-tax"
          : label.includes("Salários") || label.includes("salários")
            ? " metric-payroll"
            : label.includes("Distribuições")
              ? " metric-distribution"
              : "")
      }
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="metric-label">
        {label}
        <span className="metric-icon">
          {tone === "green" ? (
            <ArrowDownLeft size={16} />
          ) : tone === "red" ? (
            <ArrowUpRight size={16} />
          ) : (
            <Wallet size={16} />
          )}
        </span>
      </div>
      <strong>{money(value)}</strong>
      <small>{detail}</small>
    </button>
  );
}
function Empty({ text = "Nenhum registro neste filtro." }: { text?: string }) {
  return (
    <div className="empty">
      <Layers size={28} />
      <p>{text}</p>
    </div>
  );
}
function Table({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Section({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export default function Workspace({
  user,
  page,
  projectId,
}: {
  user: UserId;
  page: string;
  projectId?: string;
}) {
  const router = useRouter(),
    search = useSearchParams();
  const [s, setS] = useState<State | null>(null),
    [personal, setPersonal] = useState<Personal | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<FormSpec | null>(null),
    [mobile, setMobile] = useState(false),
    [company, setCompany] = useState(search.get("empresa") || ""),
    [project, setProject] = useState(search.get("projeto") || ""),
    [period, setPeriod] = useState("6"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState(search.get("tipo") || ""),
    [category, setCategory] = useState(search.get("categoria") || ""),
    [stateFilter, setStateFilter] = useState(""),
    [fromDate, setFromDate] = useState(""),
    [toDate, setToDate] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/data");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) throw Error("Falha ao carregar os dados.");
      setS(await r.json());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [router]);
  const loadPersonal = useCallback(async () => {
    const r = await fetch("/api/personal");
    if (r.ok) setPersonal(await r.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (page === "pessoal") loadPersonal();
  }, [page, loadPersonal]);
  useEffect(() => {
    setKind(search.get("tipo") || "");
    setCategory(search.get("categoria") || "");
  }, [search]);
  async function mutate(type: string, payload: Record<string, unknown> = {}) {
    const r = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível salvar.");
    setS(d);
    setNotice("Alteração salva na demonstração.");
    if (page === "pessoal") loadPersonal();
  }
  async function personalMutate(
    type: string,
    payload: Record<string, unknown> = {},
  ) {
    const r = await fetch("/api/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível salvar.");
    setPersonal(d);
    setNotice("Registro pessoal salvo.");
  }
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const open = (
    title: string,
    fields: Field[],
    submit: FormSpec["submit"],
    description?: string,
  ) => setModal({ title, fields, submit, description });
  if (!s)
    return (
      <main className="loading">
        <span className="brand-mark">C&R</span>
        <h2>{error || "Organizando sua visão financeira…"}</h2>
        {error && (
          <Button
            onClick={() => {
              setError("");
              load();
            }}
          >
            Tentar novamente
          </Button>
        )}
      </main>
    );
  const scope: Scope = {
    companyId: company || undefined,
    projectId: projectId || project || undefined,
  };
  const selectedProject = s.projects.find((p) => p.id === projectId);
  const effectiveScope = projectId
    ? { companyId: selectedProject?.companyId, projectId }
    : scope;
  const companies = s.companies.map((c) =>
    option(c.id, `${c.tradeName || c.name} · ${c.cnpj || "CNPJ pendente"}`),
  );
  const projects = s.projects
    .filter((p) => !p.archived)
    .map((p) =>
      option(
        p.id,
        `${p.name} · ${s.companies.find((c) => c.id === p.companyId)?.tradeName}`,
      ),
    );
  const people = s.people.map((p) => option(p.id, p.name));
  const accounts = s.accounts.map((a) =>
    option(
      a.id,
      `${a.name} · ${s.companies.find((c) => c.id === a.companyId)?.tradeName}`,
    ),
  );
  const start = new Date(
    Date.UTC(
      Number(today().slice(0, 4)),
      Number(today().slice(5, 7)) - Number(period),
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
  const summary = totals(s, effectiveScope, start, today()),
    result = dre(s, effectiveScope, start, today()),
    reserve = reserves(s, effectiveScope);
  const filtered = s.entries.filter(
    (e) =>
      (!effectiveScope.companyId || e.companyId === effectiveScope.companyId) &&
      (!effectiveScope.projectId || entryAmount(e, effectiveScope) > 0),
  );
  const title = projectId
    ? selectedProject?.name || "Projeto não encontrado"
    : page === "pessoal"
      ? "Meu Financeiro"
      : nav.find((n) => n[0] === page)?.[1] || "Visão geral";
  function goEntries(extra: string) {
    router.push(
      `/lancamentos?empresa=${effectiveScope.companyId || ""}&projeto=${effectiveScope.projectId || ""}&de=${start}&ate=${today()}&${extra}`,
    );
  }
  function newEntry(defaultKind: Kind = "despesa") {
    open(
      "Novo lançamento",
      [
        select(
          "projectId",
          "Projeto responsável",
          projects,
          projectId || project || undefined,
        ),
        select(
          "kind",
          "Tipo",
          [
            option("despesa", "Despesa"),
            option("receita", "Recebimento"),
            ...(!["receita", "despesa"].includes(defaultKind)
              ? [
                  option("distribuicao", "Distribuição"),
                  option("adiantamento", "Adiantamento de sócio"),
                  option("aporte", "Aporte de capital"),
                  option("devolucao", "Devolução de adiantamento"),
                ]
              : []),
          ],
          defaultKind,
        ),
        field("title", "Título"),
        select("paymentState", "Situação", [
          option("pending", "Ainda está pendente"),
          option("paid", "Já paguei / já recebi"),
        ]),
        {
          ...select(
            "paidAccount",
            "Conta do pagamento / recebimento",
            accounts,
          ),
          required: false,
          showWhen: { field: "paymentState", value: "paid" },
        },
        {
          ...dateField("paidDate", "Data do pagamento / recebimento"),
          required: false,
          showWhen: { field: "paymentState", value: "paid" },
        },
        moneyField(),
        select(
          "category",
          "Categoria",
          s!.categories.map((c) => option(c, c)),
          defaultKind === "receita"
            ? "Vendas"
            : defaultKind === "despesa"
              ? "Administrativo"
              : defaultKind === "distribuicao"
                ? "Distribuições"
                : "Sócios",
        ),
        select(
          "dre",
          "Classificação na DRE",
          [
            option("auto", "Automática pelo tipo"),
            option("operacional", "Despesas operacionais / administrativas"),
            option("receita", "Receita bruta"),
            option("deducao", "Deduções e tributos sobre receita"),
            option("custo", "Custos"),
            option("financeiro", "Resultado financeiro"),
            option("tributo", "Tributos sobre resultado"),
            option("fora", "Fora da DRE"),
          ],
          "auto",
        ),
        dateField("competence", "Competência", month + "-01"),
        dateField("due", "Vencimento"),
        select("recognized", "Reconhecimento", [
          option("true", "Reconhecido na competência"),
          option("false", "Previsão (fora da DRE)"),
        ]),
        select("personId", "Pessoa vinculada", [
          option("", "Sem pessoa"),
          ...people,
        ]),
        select("advanceId", "Adiantamento original (para devolução)", [
          option("", "Não se aplica"),
          ...s!.entries
            .filter((e) => e.kind === "adiantamento")
            .map((e) => option(e.id, e.title)),
        ]),
        field("description", "Descrição", "", "textarea", { required: false }),
        field("end", "Recorrência até (opcional)", "", "date", {
          required: false,
          hint: "Uma ocorrência mensal, com dia limitado ao último dia do mês.",
        }),
        select("splitProject", "Ratear com outro projeto", [
          option("", "Sem rateio"),
          ...projects,
        ]),
        select("splitMode", "Modo de rateio", [
          option("reais", "Reais para o segundo projeto"),
          option("percent", "Porcentagem para o segundo projeto"),
        ]),
        field("splitValue", "Parcela do segundo projeto", "0", "text"),
      ].map((f) => ({
        ...f,
        advanced:
          [
            "dre",
            "competence",
            "recognized",
            "personId",
            "advanceId",
            "description",
            "end",
            "splitProject",
            "splitMode",
            "splitValue",
          ].includes(f.name) &&
          !(
            !["receita", "despesa"].includes(defaultKind) &&
            ["personId", "advanceId"].includes(f.name)
          ),
      })),
      async (d) => {
        const p = s!.projects.find((p) => p.id === d.projectId)!;
        const amount = cents(d.amount);
        let allocations: { projectId: string; amount: number }[] = [];
        if (d.splitProject) {
          const value =
            d.splitMode === "percent"
              ? Number(d.splitValue.replace(",", "."))
              : cents(d.splitValue) / 100;
          if (
            d.splitMode === "percent" &&
            (!Number.isFinite(value) || value <= 0 || value >= 100)
          )
            throw Error("Porcentagem deve ficar entre 0 e 100.");
          const second =
            d.splitMode === "percent"
              ? distribute(amount, [
                  Math.round((100 - value) * 100),
                  Math.round(value * 100),
                ])[1]
              : Math.round(value * 100);
          allocations = [
            { projectId: d.projectId, amount: amount - second },
            { projectId: d.splitProject, amount: second },
          ];
        }
        await mutate("entry", {
          companyId: p.companyId,
          projectId: p.id,
          kind: d.kind,
          category: d.category,
          title: d.title,
          description: d.description,
          amount,
          competence: d.competence,
          due: d.due,
          recognized: d.recognized === "true",
          allocations,
          personId: d.personId || undefined,
          advanceId: d.advanceId || undefined,
          dre:
            d.dre === "auto"
              ? d.kind === "receita"
                ? "receita"
                : d.kind === "despesa"
                  ? "operacional"
                  : "fora"
              : d.dre,
          end: d.end,
          paymentState: d.paymentState,
          paidAccount: d.paidAccount,
          paidDate: d.paidDate,
        });
      },
      "Informe o valor, o projeto e a data. Se já pagou ou recebeu, registre tudo de uma vez.",
    );
  }
  function pay(e: Entry) {
    open(
      incoming(e) ? "Marcar como recebido" : "Marcar como pago",
      [
        moneyField(
          "amount",
          "Valor pago / recebido (R$)",
          (remaining(s!, e) / 100).toFixed(2),
        ),
        select(
          "accountId",
          "Conta da empresa",
          accounts.filter(
            (a) =>
              s!.accounts.find((x) => x.id === a.value)?.companyId ===
              e.companyId,
          ),
        ),
        dateField(),
      ],
      async (d) =>
        mutate("settle", {
          entryId: e.id,
          amount: cents(d.amount),
          accountId: d.accountId,
          date: d.date,
        }),
      `${e.title} · Pendente: ${money(remaining(s!, e))}. Pode informar um valor menor; o restante continuará pendente.`,
    );
  }
  function entryTable(entries: Entry[], compact = false) {
    return entries.length ? (
      <Table
        heads={
          compact
            ? ["Lançamento", "Valor", "Situação", ""]
            : [
                "Lançamento / categoria",
                "Empresa / projeto",
                "Quando vence",
                "Valor / pendente",
                "Situação",
                "Ações",
              ]
        }
      >
        {entries.map((e) => (
          <tr
            key={e.id}
            className={incoming(e) ? "entry-income" : "entry-expense"}
          >
            <td>
              <span
                className={
                  "transaction-icon " + (incoming(e) ? "income" : "expense")
                }
              >
                {incoming(e) ? (
                  <ArrowDownLeft size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
              <div className="cell-text">
                <span
                  className={
                    incoming(e) ? "entry-type income" : "entry-type expense"
                  }
                >
                  {incoming(e) ? "Recebimento" : "Despesa"}
                </span>
                <b>{e.title}</b>
                <small>
                  {e.category}
                  {e.seriesId ? " · Recorrente" : ""}
                  {e.allocations.length ? " · Rateado" : ""}
                </small>
              </div>
            </td>
            {!compact && (
              <>
                <td>
                  {s!.projects.find((p) => p.id === e.projectId)?.name}
                  <small>
                    {s!.companies.find((c) => c.id === e.companyId)?.tradeName}
                  </small>
                </td>
                <td>{dateLabel(e.due)}</td>
              </>
            )}
            <td className={"amount " + (incoming(e) ? "positive" : "negative")}>
              {incoming(e) ? "+" : "−"} {money(entryAmount(e, effectiveScope))}
              {!compact && <small>{money(remaining(s!, e))} pendentes</small>}
            </td>
            <td>
              <span
                className={
                  "status " +
                  (status(s!, e) === "Efetivado"
                    ? "done"
                    : status(s!, e) === "Cancelado"
                      ? "cancelled"
                      : "pending")
                }
              >
                {status(s!, e) === "Efetivado"
                  ? incoming(e)
                    ? "Recebido"
                    : "Pago"
                  : status(s!, e) === "Parcial"
                    ? "Parte pendente"
                    : status(s!, e) === "Vencido"
                      ? "Em atraso"
                      : status(s!, e)}
              </span>
            </td>
            <td>
              <div className="row-actions">
                {!e.cancelled && remaining(s!, e) > 0 && (
                  <Button
                    className={incoming(e) ? "settle-income" : "settle-expense"}
                    size="sm"
                    onClick={() => pay(e)}
                  >
                    {incoming(e) ? "Marcar como recebido" : "Marcar como pago"}
                  </Button>
                )}
                <details className="row-more">
                  <summary>Mais opções</summary>
                  {!compact && !e.recognized && !e.cancelled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        run(() => mutate("recognize", { id: e.id }))
                      }
                    >
                      Reconhecer
                    </Button>
                  )}
                  {!compact && !e.cancelled && paid(s!, e.id) === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        open(
                          "Cancelar pendência",
                          [],
                          () => mutate("cancel", { id: e.id }),
                          `Confirmar cancelamento de ${e.title}?`,
                        )
                      }
                    >
                      Cancelar
                    </Button>
                  )}
                  {!compact && paid(s!, e.id) > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        open(
                          "Histórico e estorno",
                          [
                            select(
                              "id",
                              "Baixa",
                              s!.payments
                                .filter(
                                  (p) =>
                                    p.entryId === e.id &&
                                    !p.reversalOf &&
                                    !s!.payments.some(
                                      (r) => r.reversalOf === p.id,
                                    ),
                                )
                                .map((p) =>
                                  option(
                                    p.id,
                                    `${dateLabel(p.date)} · ${money(p.amount)}`,
                                  ),
                                ),
                            ),
                            dateField(),
                          ],
                          (d) => mutate("reverse", d),
                          "Estorna uma baixa inteira, preservando a origem e o histórico pessoal.",
                        )
                      }
                    >
                      Desfazer pagamento / recebimento
                    </Button>
                  )}
                </details>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    ) : (
      <Empty />
    );
  }
  function newProject() {
    open(
      "Criar projeto",
      [
        field("name", "Nome do projeto"),
        select(
          "companyId",
          "Empresa responsável",
          companies,
          company || undefined,
        ),
        dateField("start", "Data de início"),
        field("opening", "Saldo atribuído de abertura (R$)", "0", "text"),
      ],
      async (d) => {
        const opening = d.opening === "0" ? 0 : cents(d.opening);
        await mutate("project", { ...d, opening });
      },
      "O saldo atribuído não cria dinheiro em conta. Cadastre o saldo bancário somente na conta.",
    );
  }
  function chart() {
    const months = monthsBetween(start, today());
    const rows = months.map((m) => ({
      month: m,
      ...totals(
        s!,
        effectiveScope,
        m + "-01",
        m === today().slice(0, 7) ? today() : monthDate(m, 31),
      ),
      balance: balance(
        s!,
        effectiveScope,
        m === today().slice(0, 7) ? today() : monthDate(m, 31),
      ),
    }));
    const max = Math.max(
      1,
      ...rows.flatMap((r) => [r.received, r.spent, r.balance]),
    );
    const min = Math.min(0, ...rows.map((r) => r.balance));
    const extent = max - min;
    return (
      <>
        <div
          className="chart"
          role="img"
          aria-label="Entradas em verde, saídas em vermelho e saldo final em azul, por mês"
        >
          <div className="chart-axis">
            {[1, 0.75, 0.5, 0.25, 0].map((n) => (
              <span key={n}>{money(min + extent * n)}</span>
            ))}
          </div>
          <div className="chart-plot">
            <div className="chart-grid" />
            <div className="chart-bars">
              {rows.map((r) => (
                <div className="month-bars" key={r.month}>
                  <div className="bar-set">
                    {[
                      { v: r.received, c: "green", l: "Entradas" },
                      { v: r.spent, c: "red", l: "Saídas" },
                      { v: r.balance, c: "purple", l: "Saldo" },
                    ].map((b, index) => (
                      <div
                        key={b.c}
                        title={`${b.l}: ${money(b.v)}`}
                        className={"bar " + b.c}
                        style={{
                          height: `${(Math.abs(b.v) / extent) * 100}%`,
                          minHeight: b.v === 0 ? 0 : 2,
                          position: "absolute",
                          left: `${16 + index * 25}%`,
                          width: "18%",
                          maxWidth: 13,
                          bottom: `${(-min / extent) * 100}%`,
                          transform: b.v < 0 ? "translateY(100%)" : undefined,
                        }}
                      >
                        <span>{money(b.v)}</span>
                      </div>
                    ))}
                  </div>
                  <small>
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "short",
                      year: months.length > 6 ? "2-digit" : undefined,
                      timeZone: "UTC",
                    }).format(new Date(r.month + "-01T12:00:00Z"))}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="legend">
          <span>
            <i className="green" />
            Entradas
          </span>
          <span>
            <i className="red" />
            Saídas
          </span>
          <span>
            <i className="purple" />
            Saldo final
          </span>
        </div>
        <details>
          <summary>Ver valores do gráfico</summary>
          <Table heads={["Mês", "Entradas", "Saídas", "Saldo final"]}>
            {rows.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{money(r.received)}</td>
                <td>{money(r.spent)}</td>
                <td>{money(r.balance)}</td>
              </tr>
            ))}
          </Table>
        </details>
      </>
    );
  }
  function dashboard() {
    return (
      <>
        <div className="quick-actions" aria-label="Ações rápidas">
          <span>O que você quer fazer?</span>
          <Button className="action-income" onClick={() => newEntry("receita")}>
            <ArrowDownLeft size={18} />
            Registrar entrada
          </Button>
          <Button
            className="action-expense"
            onClick={() => newEntry("despesa")}
          >
            <ArrowUpRight size={18} />
            Registrar saída
          </Button>
          <Button className="action-transfer" asChild>
            <Link href="/contas">
              <ArrowLeftRight size={18} />
              Transferir entre contas
            </Link>
          </Button>
        </div>
        <div className="metrics">
          <Metric
            label="Saldo atual"
            value={balance(s!, effectiveScope)}
            detail="Posição de hoje · todas as contas"
          />
          <Metric
            label="Caixa livre"
            value={reserve.free}
            detail="Após reservas e compromissos"
            tone="neutral"
          />
          <Metric
            label="Total recebido"
            value={summary.received}
            detail="Baixas efetivadas no período"
            tone="green"
            onClick={() => goEntries("fluxo=entradas")}
          />
          <Metric
            label="Total pago"
            value={summary.spent}
            detail="Baixas efetivadas no período"
            tone="red"
            onClick={() => goEntries("fluxo=saidas")}
          />
        </div>
        <div className="dashboard-grid">
          <Section
            title="Seu dinheiro, em perspectiva"
            sub="Movimentação de caixa no período"
            action={<span className="badge subdued">{period} meses</span>}
          >
            {chart()}
          </Section>
          <Section
            title="Reservas e compromissos"
            sub="Um passo à frente dos próximos 30 dias"
          >
            <div
              className="reserve-ring"
              style={{
                background: `conic-gradient(#00836b ${reserve.need ? Math.min(100, Math.round((reserve.reserve / reserve.need) * 100)) : 100}%, #e1ebf2 0)`,
              }}
            >
              <div>
                <strong>
                  {reserve.need
                    ? Math.min(
                        100,
                        Math.round((reserve.reserve / reserve.need) * 100),
                      )
                    : 100}
                  %
                </strong>
                <small>cobertura estimada</small>
              </div>
            </div>
            <div className="reserve-lines">
              <div>
                <span>Já reservado</span>
                <b>{money(reserve.reserve)}</b>
              </div>
              <div>
                <span>Necessidade em 30 dias</span>
                <b>{money(reserve.need)}</b>
              </div>
              <div>
                <span>Falta cobrir</span>
                <b className="amber">{money(reserve.gap)}</b>
              </div>
            </div>
            <p className="micro">
              Regra demonstrativa: pisos manuais + compromissos não cobertos.
              Recebíveis futuros não compõem o saldo atual.
            </p>
            <Link className="text-link" href="/configuracoes">
              Gerenciar reservas <ArrowRight size={14} />
            </Link>
          </Section>
        </div>
        <div className="dashboard-grid lower">
          <Section
            title="Resultado por projeto"
            sub="Recebimentos e pagamentos efetivados"
            action={
              <Link className="text-link" href="/projetos">
                Ver projetos <ArrowRight size={14} />
              </Link>
            }
          >
            <div className="project-performance">
              {s!.projects
                .filter(
                  (p) =>
                    (!effectiveScope.companyId ||
                      p.companyId === effectiveScope.companyId) &&
                    (!effectiveScope.projectId ||
                      p.id === effectiveScope.projectId) &&
                    !p.archived,
                )
                .map((p, i) => {
                  const t = totals(s!, { projectId: p.id }, start, today());
                  return (
                    <Link
                      href={"/projetos/" + p.id}
                      key={p.id}
                      className="performance-row"
                    >
                      <span className={"project-icon color-" + (i % 5)}>
                        {p.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <b>{p.name}</b>
                        <div className="performance-bars">
                          <span
                            className="green"
                            style={{
                              width: `${Math.max(4, (t.received / Math.max(1, summary.received)) * 100)}%`,
                            }}
                          />
                          <span
                            className="red"
                            style={{
                              width: `${Math.max(3, (t.spent / Math.max(1, summary.spent)) * 100)}%`,
                            }}
                          />
                        </div>
                        <small>
                          Entradas {money(t.received)} · Saídas {money(t.spent)}
                        </small>
                      </div>
                      <b
                        className={
                          t.received >= t.spent ? "positive" : "negative"
                        }
                      >
                        {money(t.received - t.spent)}
                      </b>
                    </Link>
                  );
                })}
            </div>
          </Section>
          <Section
            title="Próximos pagamentos"
            sub="Pendências que merecem sua atenção"
            action={
              <Link href="/lancamentos" className="text-link">
                Ver todos <ArrowRight size={14} />
              </Link>
            }
          >
            {filtered
              .filter(
                (e) => !incoming(e) && !e.cancelled && remaining(s!, e) > 0,
              )
              .sort((a, b) => a.due.localeCompare(b.due))
              .slice(0, 5)
              .map((e) => (
                <button className="upcoming" key={e.id} onClick={() => pay(e)}>
                  <div className="date-tile">
                    <b>{e.due.slice(8)}</b>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR", {
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(e.due + "T12:00:00Z"))}
                    </small>
                  </div>
                  <span>
                    <b>{e.title}</b>
                    <small>
                      {s!.projects.find((p) => p.id === e.projectId)?.name}
                    </small>
                  </span>
                  <span>
                    <b>{money(remaining(s!, e))}</b>
                    <small className="amber">
                      {status(s!, e) === "Efetivado"
                        ? incoming(e)
                          ? "Recebido"
                          : "Pago"
                        : status(s!, e) === "Parcial"
                          ? "Parte pendente"
                          : status(s!, e) === "Vencido"
                            ? "Em atraso"
                            : status(s!, e)}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
          </Section>
        </div>
        <div className="metrics small-metrics">
          <Metric
            label="Lucro por competência"
            value={result.net}
            detail="Reconhecido no período, inclusive pendências"
          />
          <Metric
            label="Salários e encargos pagos"
            value={s!.payments
              .filter(
                (p) =>
                  p.date >= start &&
                  p.date <= today() &&
                  ["Salários", "Encargos"].includes(
                    s!.entries.find((e) => e.id === p.entryId)!.category,
                  ),
              )
              .reduce((n, p) => n - paymentAmount(s!, p, effectiveScope), 0)}
            detail="Ver remunerações"
            tone="neutral"
            onClick={() => goEntries("grupo=salarios")}
          />
          <Metric
            label="Impostos pagos"
            value={s!.payments
              .filter(
                (p) =>
                  p.date >= start &&
                  p.date <= today() &&
                  s!.entries.find((e) => e.id === p.entryId)!.category ===
                    "Impostos",
              )
              .reduce((n, p) => n - paymentAmount(s!, p, effectiveScope), 0)}
            detail="Ver impostos"
            tone="neutral"
            onClick={() => goEntries("categoria=Impostos")}
          />
          <Metric
            label="Distribuições pagas"
            value={s!.payments
              .filter(
                (p) =>
                  p.date >= start &&
                  p.date <= today() &&
                  s!.entries.find((e) => e.id === p.entryId)!.kind ===
                    "distribuicao",
              )
              .reduce((n, p) => n - paymentAmount(s!, p, effectiveScope), 0)}
            detail={s!.people
              .filter((person) => person.userId)
              .map(
                (person) =>
                  `${person.name}: ${money(s!.payments.filter((p) => p.date >= start && p.date <= today() && s!.entries.some((e) => e.id === p.entryId && e.kind === "distribuicao" && e.personId === person.id)).reduce((n, p) => n - paymentAmount(s!, p, effectiveScope), 0))}`,
              )
              .join(" · ")}
            tone="neutral"
            onClick={() => goEntries("tipo=distribuicao")}
          />
        </div>
      </>
    );
  }
  function entriesPage() {
    const list = filtered.filter(
      (e) =>
        (!search.get("grupo") ||
          ["Salários", "Encargos"].includes(e.category)) &&
        (!search.get("de") ||
          s!.payments.some(
            (p) =>
              p.entryId === e.id &&
              p.date >= search.get("de")! &&
              p.date <= search.get("ate")! &&
              (!search.get("fluxo") ||
                paymentAmount(s!, p, effectiveScope) >= 0 ===
                  (search.get("fluxo") === "entradas")),
          )) &&
        (!kind || e.kind === kind) &&
        (!category || e.category === category) &&
        (!stateFilter || status(s!, e) === stateFilter) &&
        (!fromDate || e.due >= fromDate) &&
        (!toDate || e.due <= toDate) &&
        `${e.title} ${e.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return (
      <Section
        title="Todos os lançamentos"
        sub={`${list.length} registros · acompanhe o que entrou, saiu e ainda está pendente`}
        action={
          <Button onClick={() => newEntry()}>
            <Plus size={16} />
            Novo lançamento
          </Button>
        }
      >
        <div className="entry-tabs">
          <button
            className={!kind ? "selected" : ""}
            onClick={() => setKind("")}
          >
            Todos
          </button>
          <button
            className={kind === "receita" ? "income selected" : "income"}
            onClick={() => setKind("receita")}
          >
            ↓ Recebimentos
          </button>
          <button
            className={kind === "despesa" ? "expense selected" : "expense"}
            onClick={() => setKind("despesa")}
          >
            ↑ Despesas
          </button>
        </div>
        <div className="table-filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar lançamento"
              placeholder="Buscar lançamento…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Tipo"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {[
              "receita",
              "despesa",
              "distribuicao",
              "adiantamento",
              "aporte",
              "devolucao",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {s!.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">Todas as situações</option>
            {["Pendente", "Parcial", "Efetivado", "Vencido", "Cancelado"].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
          <label>
            Vencimento de
            <input
              aria-label="Vencimento inicial"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label>
            até
            <input
              aria-label="Vencimento final"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        {entryTable(list)}
      </Section>
    );
  }
  function accountsPage() {
    return (
      <>
        <div className="account-grid">
          {s!.accounts
            .filter((a) => !company || a.companyId === company)
            .map((a) => (
              <div className="account-card" key={a.id}>
                <div>
                  <Landmark size={22} />
                  <span className="badge subdued">DEMONSTRAÇÃO</span>
                </div>
                <h3>{a.name}</h3>
                <p>{s!.companies.find((c) => c.id === a.companyId)?.name}</p>
                <strong>{money(accountBalance(s!, a.id))}</strong>
                <small>Saldo atual · abertura {money(a.opening)}</small>
              </div>
            ))}
        </div>
        <div className="toolbar">
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Nova conta",
                [
                  field("name", "Nome da conta"),
                  select("companyId", "Empresa / CNPJ", companies),
                  field("opening", "Saldo inicial (R$)", "0"),
                ],
                (d) =>
                  mutate("account", {
                    ...d,
                    opening: d.opening === "0" ? 0 : cents(d.opening),
                  }),
              )
            }
          >
            <Plus size={16} />
            Adicionar conta
          </Button>
          <Button
            onClick={() =>
              open(
                "Transferência entre contas",
                [
                  select("from", "Conta de origem", accounts),
                  select("to", "Conta de destino", accounts),
                  moneyField(),
                  dateField(),
                  field(
                    "nature",
                    "Natureza contábil",
                    "Transferência entre contas próprias",
                  ),
                ],
                (d) => mutate("transfer", { ...d, amount: cents(d.amount) }),
                "Entre CNPJs, informe a natureza (ex.: mútuo). Um único registro vincula as duas pontas; não gera receita.",
              )
            }
          >
            Transferir entre contas
          </Button>
        </div>
        <details className="optional-reconciliation">
          <summary>Conferir pagamentos com o extrato (opcional)</summary>
          <Section
            title="Conferência do extrato"
            sub="Confira cada baixa com o extrato. Estornos preservam o vínculo original."
          >
            <Table
              heads={["Data", "Lançamento", "Conta", "Valor", "Conciliação"]}
            >
              {s!.payments
                .filter(
                  (p) =>
                    !company ||
                    s!.accounts.find((a) => a.id === p.accountId)?.companyId ===
                      company,
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td>{dateLabel(p.date)}</td>
                    <td>
                      {s!.entries.find((e) => e.id === p.entryId)?.title}
                      <small>
                        {p.reversalOf
                          ? "Estorno vinculado a " + p.reversalOf
                          : "Baixa " + p.id.slice(0, 8)}
                      </small>
                    </td>
                    <td>
                      {s!.accounts.find((a) => a.id === p.accountId)?.name}
                    </td>
                    <td
                      className={
                        paymentAmount(s!, p) >= 0 ? "positive" : "negative"
                      }
                    >
                      {money(paymentAmount(s!, p))}
                    </td>
                    <td>
                      <Button
                        variant={p.reconciled ? "ghost" : "outline"}
                        size="sm"
                        onClick={() =>
                          run(() => mutate("reconcile", { id: p.id }))
                        }
                      >
                        {p.reconciled ? (
                          <>
                            <Check size={14} />
                            Conciliado
                          </>
                        ) : (
                          "Conferir baixa"
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
            </Table>
          </Section>
        </details>
        <Section
          title="Transferências vinculadas"
          sub="As duas pontas preservam o impacto de cada CNPJ, sem inflar entradas e saídas do grupo."
        >
          <Table heads={["Data", "Origem → destino", "Natureza", "Valor"]}>
            {s!.transfers
              .filter(
                (t) =>
                  !company ||
                  [t.from, t.to].some(
                    (id) =>
                      s!.accounts.find((a) => a.id === id)?.companyId ===
                      company,
                  ),
              )
              .map((t) => (
                <tr key={t.id}>
                  <td>{dateLabel(t.date)}</td>
                  <td>
                    {s!.accounts.find((a) => a.id === t.from)?.name} →{" "}
                    {s!.accounts.find((a) => a.id === t.to)?.name}
                    <small>Vínculo: {t.id}</small>
                  </td>
                  <td>{t.nature}</td>
                  <td>{money(t.amount)}</td>
                </tr>
              ))}
          </Table>
        </Section>
      </>
    );
  }
  function flowPage() {
    const rows = dailyFlow(s!, effectiveScope, month);
    const future = filtered.filter(
      (e) =>
        !e.cancelled && remaining(s!, e) > 0 && e.due.slice(0, 7) === month,
    );
    return (
      <>
        <Section
          title="Caixa realizado"
          sub="Todos os dias do mês, inclusive sem movimento. Valores conforme a data efetiva de cada baixa."
          action={
            <input
              aria-label="Mês do fluxo"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          }
        >
          <Table
            heads={[
              "Dia",
              "Saldo inicial",
              "Entradas",
              "Saídas",
              "Transferências líquidas",
              "Saldo final",
            ]}
          >
            {rows.map((r) => (
              <tr key={r.date}>
                <td>{dateLabel(r.date)}</td>
                <td>{money(r.initial)}</td>
                <td className="positive">{money(r.received)}</td>
                <td className="negative">{money(r.spent)}</td>
                <td>{money(r.transfers)}</td>
                <td className="purple-text">
                  <b>{money(r.final)}</b>
                </td>
              </tr>
            ))}
          </Table>
        </Section>
        <Section
          title="Projeção de pendências"
          sub="Recebíveis e pagamentos previstos; não integram o saldo realizado."
        >
          {entryTable(future)}
        </Section>
      </>
    );
  }
  function drePage() {
    const r = dre(s!, effectiveScope, month + "-01", month + "-31");
    const lines: [string, number, boolean][] = [
      ["Receita bruta", r.receita, false],
      ["(−) Deduções e tributos sobre receita", -r.deducao, false],
      ["Receita líquida", r.receita - r.deducao, true],
      ["(−) Custos", -r.custo, false],
      ["(−) Despesas operacionais e administrativas", -r.operacional, false],
      ["Resultado financeiro", r.financeiro, false],
      ["(−) Tributos sobre resultado", -r.tributo, false],
      ["Lucro líquido por competência", r.net, true],
    ];
    return (
      <>
        <Section
          title="Demonstração do resultado"
          sub="Regime de competência · pendências reconhecidas incluídas · movimentações patrimoniais excluídas"
          action={
            <input
              aria-label="Competência da DRE"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          }
        >
          <Table heads={["Classificação gerencial", "Resultado"]}>
            {lines.map(([name, value, bold]) => (
              <tr key={name} className={bold ? "total-row" : ""}>
                <td>{name}</td>
                <td className={value < 0 ? "negative" : "purple-text"}>
                  {money(value)}
                </td>
              </tr>
            ))}
          </Table>
          <div className="notice">
            <ShieldCheck size={18} />
            <p>
              Saldo de abertura, transferências, aportes, adiantamentos,
              devoluções e distribuições ficam fora da DRE.
            </p>
          </div>
        </Section>
        <Section
          title="Composição por projeto"
          sub="Rateios são atribuídos uma vez a cada destino."
        >
          <Table
            heads={["Projeto", "Receita", "Custos e despesas", "Resultado"]}
          >
            {s!.projects
              .filter((p) => !company || p.companyId === company)
              .map((p) => {
                const r = dre(
                  s!,
                  { projectId: p.id },
                  month + "-01",
                  month + "-31",
                );
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={"/projetos/" + p.id}>{p.name}</Link>
                    </td>
                    <td>{money(r.receita)}</td>
                    <td>
                      {money(
                        r.deducao +
                          r.custo +
                          r.operacional +
                          r.tributo -
                          r.financeiro,
                      )}
                    </td>
                    <td>{money(r.net)}</td>
                  </tr>
                );
              })}
          </Table>
        </Section>
        <Section
          title="Reconhecidos na competência"
          sub="Inclui identificação de administrativo e rateios."
        >
          {entryTable(
            filtered.filter(
              (e) =>
                e.recognized &&
                e.dre !== "fora" &&
                e.competence.slice(0, 7) === month,
            ),
          )}
        </Section>
        <Section
          title="Previsões não reconhecidas"
          sub="Excluídas do resultado até o reconhecimento."
        >
          {entryTable(filtered.filter((e) => !e.recognized))}
        </Section>
      </>
    );
  }
  function projectsPage() {
    if (projectId && !selectedProject)
      return (
        <Empty text="Projeto não encontrado. Volte à lista de projetos." />
      );
    if (selectedProject) {
      const p = selectedProject;
      return (
        <>
          <div className="project-detail-heading">
            <Link className="text-link" href="/projetos">
              ← Todos os projetos
            </Link>
            <span className="badge subdued">
              {s!.companies.find((c) => c.id === p.companyId)?.name}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                open(
                  "Editar projeto",
                  [
                    field("name", "Nome", p.name),
                    select(
                      "archived",
                      "Situação",
                      [option("false", "Ativo"), option("true", "Arquivado")],
                      String(p.archived),
                    ),
                  ],
                  (d) =>
                    mutate("project-edit", {
                      id: p.id,
                      name: d.name,
                      archived: d.archived === "true",
                    }),
                )
              }
            >
              Editar projeto
            </Button>
          </div>
          <div className="metrics">
            <Metric
              label="Saldo atribuído"
              value={balance(s!, { projectId: p.id })}
              detail={`Abertura atribuída ${money(p.opening)}`}
            />
            <Metric
              label="Reserva do projeto"
              value={p.reserve}
              detail="Piso manual demonstrativo"
              tone="neutral"
            />
            <Metric
              label="Caixa livre atribuído"
              value={reserve.free}
              detail="Após reservas e compromissos"
              tone="neutral"
            />
            <Metric
              label="Recebíveis futuros"
              value={filtered
                .filter((e) => incoming(e) && !e.cancelled)
                .reduce(
                  (n, e) =>
                    n +
                    Math.round(
                      (remaining(s!, e) * entryAmount(e, effectiveScope)) /
                        e.amount,
                    ),
                  0,
                )}
              detail="Não incluídos no saldo atual"
              tone="green"
            />
          </div>
          <Section
            title="Fluxo do projeto"
            sub={`Início ${dateLabel(p.start)} · histórico anterior via saldo atribuído, sem nova entrada bancária.`}
          >
            {chart()}
          </Section>
          <div className="dashboard-grid">
            <Section title="Equipe e vínculos">
              {s!.contracts
                .filter((c) => c.projectId === p.id)
                .map((c) => (
                  <div className="list-row" key={c.id}>
                    <span>
                      {s!.people.find((p) => p.id === c.personId)?.name}
                      <small>
                        {c.type} · {dateLabel(c.start)} a{" "}
                        {c.end ? dateLabel(c.end) : "prazo aberto"}
                      </small>
                    </span>
                    <b>{money(c.amount)}</b>
                  </div>
                ))}
            </Section>
            <Section title="Participantes">
              {s!.compositions
                .filter((c) => c.projectId === p.id && !c.end)
                .flatMap((c) =>
                  c.shares.map((x) => (
                    <div className="list-row" key={x.personId}>
                      <span>
                        {x.personId === "grupo"
                          ? "Grupo C&R Digital"
                          : s!.people.find((p) => p.id === x.personId)?.name}
                      </span>
                      <b>{x.bps / 100}%</b>
                    </div>
                  )),
                )}
              <p className="micro">
                Sem composição específica, o exemplo atribui 100% ao grupo.
              </p>
              <p>
                Resultado por competência no período: <b>{money(result.net)}</b>
              </p>
            </Section>
          </div>
          <Section title="Lançamentos e próximos pagamentos">
            {entryTable(filtered)}
          </Section>
          <Section
            title="DRE e fluxo detalhados"
            sub="Use os filtros superiores para consultar o projeto nos relatórios."
          >
            <div className="toolbar">
              <Button
                variant="outline"
                onClick={() => {
                  setProject(p.id);
                  setCompany(p.companyId);
                  router.push(`/dre?empresa=${p.companyId}&projeto=${p.id}`);
                }}
              >
                Abrir DRE do projeto
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setProject(p.id);
                  setCompany(p.companyId);
                  router.push(`/fluxo?empresa=${p.companyId}&projeto=${p.id}`);
                }}
              >
                Abrir fluxo diário
              </Button>
            </div>
          </Section>
        </>
      );
    }
    return (
      <>
        <div className="toolbar">
          <span>{s!.projects.length} projetos no grupo</span>
          <Button onClick={newProject}>
            <Plus size={16} />
            Criar projeto
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Repasse interno por projeto",
                [
                  select("from", "Projeto de origem", projects),
                  select("to", "Projeto de destino", projects),
                  moneyField(),
                  dateField(),
                ],
                (d) => mutate("reallocate", { ...d, amount: cents(d.amount) }),
                "Altera a atribuição dentro do mesmo CNPJ. Não movimenta contas, caixa consolidado ou DRE.",
              )
            }
          >
            Repassar saldo
          </Button>
        </div>
        <div className="project-grid">
          {s!.projects
            .filter((p) => !company || p.companyId === company)
            .map((p, i) => {
              const r = reserves(s!, { projectId: p.id });
              return (
                <Link
                  className="project-card"
                  href={"/projetos/" + p.id}
                  key={p.id}
                >
                  <div>
                    <span className={"project-icon color-" + (i % 5)}>
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span
                      className={
                        "status " + (p.archived ? "cancelled" : "done")
                      }
                    >
                      {p.archived ? "Arquivado" : "Ativo"}
                    </span>
                  </div>
                  <h2>{p.name}</h2>
                  <p>
                    {s!.companies.find((c) => c.id === p.companyId)?.tradeName}
                  </p>
                  <small>Saldo atribuído</small>
                  <strong>{money(balance(s!, { projectId: p.id }))}</strong>
                  <div className="project-card-footer">
                    <span>
                      Reserva <b>{money(p.reserve)}</b>
                    </span>
                    <span>
                      Caixa livre <b>{money(r.free)}</b>
                    </span>
                    <ArrowUpRight size={20} />
                  </div>
                </Link>
              );
            })}
        </div>
        <Section title="Histórico de repasses">
          <Table heads={["Data", "Origem", "Destino", "Valor"]}>
            {s!.reallocations.map((r) => (
              <tr key={r.id}>
                <td>{dateLabel(r.date)}</td>
                <td>{s!.projects.find((p) => p.id === r.from)?.name}</td>
                <td>{s!.projects.find((p) => p.id === r.to)?.name}</td>
                <td>{money(r.amount)}</td>
              </tr>
            ))}
          </Table>
        </Section>
      </>
    );
  }
  function peoplePage() {
    return (
      <>
        <div className="toolbar">
          <Button
            onClick={() =>
              open(
                "Cadastrar pessoa",
                [
                  field("name", "Nome"),
                  field("cpf", "CPF fictício", "", "text", { required: false }),
                  field("rg", "RG fictício", "", "text", { required: false }),
                ],
                (d) => mutate("person", d),
              )
            }
          >
            <Plus size={16} />
            Nova pessoa
          </Button>
          <Button variant="outline" onClick={() => newContract()}>
            Novo vínculo
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Gerar compromissos dos vínculos",
                [field("month", "Competência", month, "month")],
                (d) => mutate("generate-contracts", d),
                "Geração idempotente: um compromisso por vínculo e competência vigente.",
              )
            }
          >
            Gerar compromissos
          </Button>
        </div>
        {s!.people.map((person) => {
          const entries = s!.entries.filter(
            (e) =>
              e.personId === person.id &&
              ["receita", "despesa"].includes(e.kind),
          );
          return (
            <Section
              key={person.id}
              title={person.name}
              sub={`${person.cpf} · ${person.rg}${person.userId ? " · Usuário vinculado: " + person.userId : ""}`}
              action={
                <span className="badge subdued">
                  Pago: {money(entries.reduce((n, e) => n + paid(s!, e.id), 0))}
                </span>
              }
            >
              <Table
                heads={[
                  "Projeto / vínculo",
                  "Vigência",
                  "Condição mensal",
                  "Documentos",
                  "Histórico",
                ]}
              >
                {s!.contracts
                  .filter((c) => c.personId === person.id)
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        {s!.projects.find((p) => p.id === c.projectId)?.name}
                        <small>
                          {c.type} · {c.cnpj || "Sem CNPJ"}
                        </small>
                      </td>
                      <td>
                        {dateLabel(c.start)} →{" "}
                        {c.end ? dateLabel(c.end) : "Em andamento"}
                        <small>
                          {Math.max(
                            0,
                            Math.floor(
                              (Date.parse(today()) - Date.parse(c.start)) /
                                86400000,
                            ),
                          )}{" "}
                          dias desde o início
                        </small>
                      </td>
                      <td>
                        {money(c.amount)}
                        <small>Dia {c.day}</small>
                      </td>
                      <td>
                        {c.attachments.map((a, i) => (
                          <a
                            className="text-link"
                            href={a.data}
                            download={a.name}
                            key={i}
                          >
                            {a.name}
                          </a>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => newContract(c.id)}
                        >
                          Reajustar / renovar
                        </Button>
                      </td>
                      <td>
                        {s!.entries
                          .filter((e) => e.contractId === c.id)
                          .map((e) => (
                            <div key={e.id}>
                              {e.competence.slice(0, 7)} ·{" "}
                              {money(paid(s!, e.id))} pagos
                              <small>
                                {money(remaining(s!, e))} pendentes ·{" "}
                                {status(s!, e) === "Efetivado"
                                  ? incoming(e)
                                    ? "Recebido"
                                    : "Pago"
                                  : status(s!, e) === "Parcial"
                                    ? "Parte pendente"
                                    : status(s!, e) === "Vencido"
                                      ? "Em atraso"
                                      : status(s!, e)}
                              </small>
                            </div>
                          ))}
                      </td>
                    </tr>
                  ))}
              </Table>
              <details>
                <summary>Histórico único de pagamentos da pessoa</summary>
                {entryTable(entries)}
              </details>
            </Section>
          );
        })}
      </>
    );
  }
  function newContract(previousId?: string) {
    const previous = s!.contracts.find((c) => c.id === previousId);
    open(
      previous ? "Reajustar vínculo" : "Novo vínculo",
      [
        select("personId", "Pessoa", people, previous?.personId),
        select(
          "projectId",
          "Projeto / administrativo",
          projects,
          previous?.projectId,
        ),
        select(
          "type",
          "Tipo",
          [option("PJ", "PJ"), option("CLT", "CLT")],
          previous?.type,
        ),
        field("cnpj", "CNPJ (PJ)", previous?.cnpj || "", "text", {
          required: false,
        }),
        dateField("start", "Início da condição"),
        field("end", "Término (opcional)", "", "date", { required: false }),
        moneyField(
          "amount",
          "Valor mensal (R$)",
          previous ? (previous.amount / 100).toFixed(2) : "",
        ),
        field("day", "Dia do pagamento", previous?.day || 5, "number"),
      ],
      async (d) => {
        const project = s!.projects.find((p) => p.id === d.projectId)!;
        await mutate("contract", {
          ...d,
          companyId: project.companyId,
          amount: cents(d.amount),
          day: Number(d.day),
          attachments: [],
          previousId,
        });
      },
      "As condições anteriores ficam preservadas. Para anexar um documento fictício, use o campo abaixo da lista de vínculos em Configurações.",
    );
  }
  function partnersPage() {
    return (
      <>
        <div className="toolbar">
          <Button onClick={() => newEntry("adiantamento")}>
            <Plus size={16} />
            Movimentação de sócio
          </Button>
          <Button variant="outline" onClick={() => newEntry("devolucao")}>
            Registrar devolução
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Nova composição de participação",
                [
                  select("projectId", "Composição", [
                    option("grupo", "Holding / grupo"),
                    ...projects,
                  ]),
                  select("first", "Primeiro participante", [
                    option("grupo", "Grupo C&R Digital"),
                    ...people,
                  ]),
                  field("percent", "Participação do primeiro (%)", "50"),
                  select(
                    "second",
                    "Segundo participante",
                    people,
                    "claudecir-p",
                  ),
                  dateField("start", "Vigência inicial", addDays(today(), 1)),
                ],
                (d) => {
                  const bps = Math.round(
                    Number(d.percent.replace(",", ".")) * 100,
                  );
                  return mutate("composition", {
                    projectId: d.projectId,
                    start: d.start,
                    end: "",
                    shares: [
                      { personId: d.first, bps },
                      { personId: d.second, bps: 10000 - bps },
                    ],
                  });
                },
                "A soma deve fechar em 100%. As composições antigas e as usadas em fechamentos são preservadas.",
              )
            }
          >
            Editar participações
          </Button>
        </div>
        <div className="account-grid">
          {s!.people
            .filter(
              (p) =>
                ["rafael-p", "claudecir-p"].includes(p.id) ||
                s!.entries.some(
                  (e) => e.personId === p.id && e.kind === "adiantamento",
                ),
            )
            .map((p) => {
              const own = s!.entries.filter((e) => e.personId === p.id);
              const advanced = own
                  .filter((e) => e.kind === "adiantamento")
                  .reduce((n, e) => n + paid(s!, e.id), 0),
                returned = own
                  .filter((e) => e.kind === "devolucao")
                  .reduce((n, e) => n + paid(s!, e.id), 0);
              return (
                <div className="account-card" key={p.id}>
                  <span className="avatar">{p.name[0]}</span>
                  <h2>{p.name}</h2>
                  <div className="reserve-lines">
                    <div>
                      <span>Adiantamentos recebidos</span>
                      <b>{money(advanced)}</b>
                    </div>
                    <div>
                      <span>Capital aportado</span>
                      <b>
                        {money(
                          own
                            .filter((e) => e.kind === "aporte")
                            .reduce((n, e) => n + paid(s!, e.id), 0),
                        )}
                      </b>
                    </div>
                    <div>
                      <span>Devolvido</span>
                      <b>{money(returned)}</b>
                    </div>
                    <div>
                      <span>A recuperar</span>
                      <b className="purple-text">
                        {money(advanced - returned)}
                      </b>
                    </div>
                    <div>
                      <span>Distribuições pagas</span>
                      <b className="positive">
                        {money(
                          own
                            .filter((e) => e.kind === "distribuicao")
                            .reduce((n, e) => n + paid(s!, e.id), 0),
                        )}
                      </b>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <Section
          title="Participações e vigências"
          sub="Adiantamentos e aportes não alteram percentuais automaticamente."
        >
          <Table heads={["Composição", "Vigência", "Participantes"]}>
            {s!.compositions.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.projectId === "grupo"
                    ? "Grupo C&R Digital"
                    : s!.projects.find((p) => p.id === c.projectId)?.name}
                </td>
                <td>
                  {dateLabel(c.start)} → {c.end ? dateLabel(c.end) : "Atual"}
                </td>
                <td>
                  {c.shares.map((x) => (
                    <div key={x.personId}>
                      {x.personId === "grupo"
                        ? "Grupo C&R Digital"
                        : s!.people.find((p) => p.id === x.personId)?.name}
                      : {x.bps / 100}%
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </Table>
        </Section>
        <Section title="Movimentações de sócios">
          {entryTable(
            filtered.filter((e) =>
              ["adiantamento", "aporte", "devolucao", "distribuicao"].includes(
                e.kind,
              ),
            ),
          )}
        </Section>
      </>
    );
  }
  function closingPage() {
    return (
      <>
        <div className="notice">
          <ClipboardCheck size={22} />
          <p>
            <b>Fechamento demonstrativo.</b> Confira caixa, pendências e
            rateios. Aprovar uma distribuição cria um compromisso; o dinheiro
            sai somente na baixa. O exemplo distribui lucros positivos por
            projeto sem compensar prejuízos, sem bloqueio automático por caixa.
          </p>
        </div>
        <div className="metrics">
          <Metric
            label="Resultado apurado"
            value={dre(s!, effectiveScope, month + "-01", month + "-31").net}
            detail="Lucro reconhecido por competência"
          />
          <Metric
            label="Caixa disponível"
            value={balance(s!, effectiveScope)}
            detail="Conferência do saldo de hoje"
            tone="neutral"
          />
          <Metric
            label="Pendências do mês"
            value={filtered
              .filter(
                (e) =>
                  !e.cancelled && e.due.slice(0, 7) === month && !incoming(e),
              )
              .reduce((n, e) => n + remaining(s!, e), 0)}
            detail="Não bloqueiam o exemplo de fechamento"
            tone="red"
          />
          <Metric
            label="Rateios do mês"
            value={filtered
              .filter(
                (e) =>
                  e.allocations.length > 0 &&
                  e.competence.slice(0, 7) === month,
              )
              .reduce((n, e) => n + e.amount, 0)}
            detail="Validar atribuições antes de aprovar"
            tone="neutral"
          />
        </div>
        <Section
          title="Fechamentos mensais"
          action={
            <Button
              onClick={() =>
                open(
                  "Aprovar fechamento mensal",
                  [
                    select(
                      "companyId",
                      "Empresa responsável",
                      companies,
                      company || undefined,
                    ),
                    field("month", "Competência", month, "month"),
                    field("approved", "Valor total aprovado (R$)", "0"),
                    field("note", "Conferência / observações", "", "textarea"),
                  ],
                  (d) =>
                    mutate("closing", {
                      ...d,
                      approved: d.approved === "0" ? 0 : cents(d.approved),
                    }),
                  "A parcela do grupo é apurada depois dos participantes do projeto. O repasse interno não gera receita nem nova entrada de caixa.",
                )
              }
            >
              <ClipboardCheck size={16} />
              Fechar competência
            </Button>
          }
        >
          <Table
            heads={[
              "Empresa / competência",
              "Apurado",
              "Aprovado",
              "Pago",
              "Situação",
              "",
            ]}
          >
            {s!.closings
              .filter((c) => !company || c.companyId === company)
              .map((c) => (
                <tr key={c.id}>
                  <td>
                    {s!.companies.find((e) => e.id === c.companyId)?.tradeName}
                    <small>
                      {c.month} · {c.note}
                    </small>
                    <details>
                      <summary>Composição preservada</summary>
                      {c.allocations.map((a) => (
                        <p key={a.projectId}>
                          {s!.projects.find((p) => p.id === a.projectId)?.name}:
                          lucro {money(a.profit)} · grupo {money(a.groupShare)}{" "}
                          · parceiros {money(a.externalShare)}
                        </p>
                      ))}
                      {c.compositions.map((comp) => (
                        <p key={comp.id}>
                          {comp.projectId}:{" "}
                          {comp.shares
                            .map((x) => `${x.personId} ${x.bps / 100}%`)
                            .join(" / ")}
                        </p>
                      ))}
                    </details>
                  </td>
                  <td>{money(c.profit)}</td>
                  <td>{money(c.approved)}</td>
                  <td>
                    {money(
                      c.distributionIds.reduce((n, id) => n + paid(s!, id), 0),
                    )}
                  </td>
                  <td>
                    <span className="status pending">{c.status}</span>
                  </td>
                  <td>
                    {c.status === "fechado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          open(
                            "Reabrir fechamento",
                            [
                              field(
                                "note",
                                "Motivo da reabertura",
                                "",
                                "textarea",
                              ),
                            ],
                            (d) => mutate("reopen", { id: c.id, ...d }),
                            "A reabertura fica no histórico com autor e horário. Baixas não são apagadas.",
                          )
                        }
                      >
                        Reabrir
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </Table>
          {!s!.closings.length && (
            <Empty text="Nenhum fechamento aprovado. Comece pela conferência do mês." />
          )}
        </Section>
        <Section title="Distribuições aprovadas a pagar">
          {entryTable(filtered.filter((e) => e.kind === "distribuicao"))}
        </Section>
      </>
    );
  }
  function settingsPage() {
    return (
      <>
        <Section
          title="Empresas do grupo"
          sub="CNPJ único por empresa. Projetos em preparação podem ter CNPJ pendente."
          action={
            <Button
              onClick={() =>
                open(
                  "Cadastrar empresa",
                  [
                    field("name", "Razão social"),
                    field("tradeName", "Nome fantasia", "", "text", {
                      required: false,
                    }),
                    field("cnpj", "CNPJ (14 dígitos)", "", "text", {
                      required: false,
                      hint: "Deixe vazio se estiver em preparação.",
                    }),
                  ],
                  (d) => mutate("company", d),
                )
              }
            >
              <Plus size={16} />
              Nova empresa
            </Button>
          }
        >
          <Table heads={["Razão social", "Nome fantasia", "CNPJ"]}>
            {s!.companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.tradeName}</td>
                <td>{c.cnpj || "Pendente · em preparação"}</td>
              </tr>
            ))}
          </Table>
        </Section>
        <div className="dashboard-grid">
          <Section
            title="Categorias e subcategorias"
            sub="Use Categoria / Subcategoria para organizar a operação."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  open(
                    "Nova categoria",
                    [field("name", "Categoria / subcategoria")],
                    (d) => mutate("category", d),
                  )
                }
              >
                Adicionar
              </Button>
            }
          >
            <div className="tags">
              {s!.categories.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </Section>
          <Section
            title="Pisos de reserva"
            sub="Política provisória de demonstração"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  open(
                    "Configurar reserva",
                    [
                      select(
                        "companyId",
                        "Empresa (para reserva geral)",
                        companies,
                      ),
                      select("projectId", "Destino", [
                        option("", "Reserva geral da empresa"),
                        ...projects,
                      ]),
                      field("amount", "Piso (R$)", "0"),
                    ],
                    (d) =>
                      mutate("reserve", {
                        ...d,
                        amount: d.amount === "0" ? 0 : cents(d.amount),
                      }),
                  )
                }
              >
                Configurar
              </Button>
            }
          >
            <div className="reserve-lines">
              {s!.companies.map((c) => (
                <div key={c.id}>
                  <span>Geral · {c.tradeName}</span>
                  <b>{money(s!.generalReserves[c.id] || 0)}</b>
                </div>
              ))}
              {s!.projects.map((p) => (
                <div key={p.id}>
                  <span>{p.name}</span>
                  <b>{money(p.reserve)}</b>
                </div>
              ))}
            </div>
            <p className="micro">
              Caixa livre = saldo − reservas − máximo(0, compromissos vencidos
              ou nos próximos 30 dias − reservas). Cobertura agregada por
              filtro; não é política definitiva.
            </p>
          </Section>
        </div>
        <Section
          title="Documentos demonstrativos dos vínculos"
          sub="Somente arquivos fictícios, PDF ou texto, até 500 KB. Acesso restrito à sessão empresarial."
        >
          {s!.contracts.map((c) => (
            <label className="upload-row" key={c.id}>
              <span>
                {s!.people.find((p) => p.id === c.personId)?.name} ·{" "}
                {s!.projects.find((p) => p.id === c.projectId)?.name}
              </span>
              <input
                aria-label={`Anexar documento ao vínculo ${c.id}`}
                type="file"
                accept="application/pdf,text/plain"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 500000 ||
                    !["application/pdf", "text/plain"].includes(file.type)
                  ) {
                    setError("Use PDF ou TXT com até 500 KB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () =>
                    run(() =>
                      mutate("attachment", {
                        id: c.id,
                        name: file.name,
                        data: reader.result,
                      }),
                    );
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          ))}
        </Section>
        <Section
          title="Trilha de auditoria"
          sub="Autor, horário e alteração das operações sensíveis. Dados somente demonstrativos."
        >
          <Table heads={["Quando (São Paulo)", "Autor", "Ação", "Detalhes"]}>
            {s!.audit.slice(0, 60).map((a) => (
              <tr key={a.id}>
                <td>
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(a.at))}
                </td>
                <td>{a.actor}</td>
                <td>{a.action}</td>
                <td>
                  <details>
                    <summary>Consultar alteração</summary>
                    <pre>{a.detail}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </Table>
        </Section>
        <Section
          title="Dados da demonstração"
          sub="Os dados ficam em arquivo local no servidor desta demonstração."
        >
          <div className="toolbar">
            <Button
              variant="destructive"
              onClick={() =>
                open(
                  "Redefinir dados empresariais",
                  [],
                  () => mutate("reset"),
                  "Restaura empresas, contas, projetos e movimentos fictícios. Não apaga registros pessoais privados de outros titulares.",
                )
              }
            >
              <RotateCcw size={16} />
              Redefinir demonstração
            </Button>
          </div>
          <p className="micro">
            A integração Supabase, RLS, convites e migrações será feita na Etapa
            2. A sessão atual permite escolher usuários fictícios e não deve ser
            usada com dados reais.
          </p>
        </Section>
      </>
    );
  }
  function personalPage() {
    if (!personal) return <Empty text="Carregando seu espaço privado…" />;
    const p = personal;
    const personalBalance =
      p.accounts.reduce((n, a) => n + a.opening, 0) +
      p.entries
        .filter((e) => e.date <= today())
        .reduce((n, e) => n + (e.kind === "receita" ? e.amount : -e.amount), 0);
    const categories = p.categories.map((c) =>
        option(c.id, `${c.name} (${c.kind})`),
      ),
      sources = p.sources.map((s) => option(s.id, s.name)),
      acc = p.accounts.map((a) => option(a.id, a.name));
    return (
      <>
        <div className="notice personal-notice">
          <ShieldCheck size={22} />
          <p>
            <b>Seu espaço, {user === "rafael" ? "Rafael" : "Claudecir"}.</b>{" "}
            Seus lançamentos, categorias, fontes e contas pessoais são privados.
            Nenhum valor desta área entra no caixa ou na DRE das empresas.
          </p>
        </div>
        <div className="metrics">
          <Metric
            label="Meu saldo"
            value={personalBalance}
            detail="Abertura + entradas − saídas até hoje"
          />
          <Metric
            label="Minhas entradas"
            value={p.entries
              .filter(
                (e) =>
                  e.kind === "receita" && e.date >= start && e.date <= today(),
              )
              .reduce((n, e) => n + e.amount, 0)}
            detail="Somente seu titular · período selecionado"
            tone="green"
          />
          <Metric
            label="Minhas saídas"
            value={p.entries
              .filter(
                (e) =>
                  e.kind === "despesa" && e.date >= start && e.date <= today(),
              )
              .reduce((n, e) => n + e.amount, 0)}
            detail="Inclui estornos de recebimentos"
            tone="red"
          />
          <Metric
            label="Abertura das contas"
            value={p.accounts.reduce((n, a) => n + a.opening, 0)}
            detail={`${p.accounts.length} conta(s) pessoal(is)`}
            tone="neutral"
          />
        </div>
        <div className="toolbar">
          <Button
            onClick={() =>
              open(
                "Meu lançamento pessoal",
                [
                  field("title", "Título"),
                  select("kind", "Tipo", [
                    option("receita", "Entrada"),
                    option("despesa", "Saída"),
                  ]),
                  moneyField(),
                  dateField(),
                  select("accountId", "Minha conta", acc),
                  select("categoryId", "Minha categoria", categories),
                  select("sourceId", "Fonte externa (opcional)", [
                    option("", "Sem fonte externa"),
                    ...sources,
                  ]),
                ],
                (d) =>
                  personalMutate("entry", { ...d, amount: cents(d.amount) }),
              )
            }
          >
            <Plus size={16} />
            Lançamento pessoal
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Minha categoria pessoal",
                [
                  field("name", "Nome"),
                  select("kind", "Tipo", [
                    option("receita", "Receita"),
                    option("despesa", "Despesa"),
                  ]),
                ],
                (d) => personalMutate("category", d),
              )
            }
          >
            Nova categoria
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Minha fonte externa",
                [field("name", "Nome do pagador externo")],
                (d) => personalMutate("source", d),
                "A fonte é um pagador externo, separado dos CNPJs e empresas do grupo.",
              )
            }
          >
            Nova fonte externa
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Minha conta pessoal",
                [field("name", "Nome da conta")],
                (d) => personalMutate("account", d),
              )
            }
          >
            Nova conta
          </Button>
        </div>
        <Section
          title="Meus lançamentos"
          sub="Pagamentos empresariais são vinculados por baixa, inclusive pagamentos parciais e estornos."
        >
          <div className="table-filters">
            <input
              aria-label="Buscar lançamento pessoal"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Categoria pessoal"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {p.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Tipo pessoal"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">Entradas e saídas</option>
              <option value="receita">Entrada</option>
              <option value="despesa">Saída</option>
            </select>
            <label>
              De
              <input
                type="date"
                aria-label="Data pessoal inicial"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                aria-label="Data pessoal final"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
          <Table
            heads={[
              "Data",
              "Título / origem",
              "Categoria / fonte",
              "Conta",
              "Valor",
              "",
            ]}
          >
            {p.entries
              .filter(
                (e) =>
                  (!category || e.categoryId === category) &&
                  (!kind || e.kind === kind) &&
                  (!fromDate || e.date >= fromDate) &&
                  (!toDate || e.date <= toDate) &&
                  e.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((e) => (
                <tr key={e.id}>
                  <td>{dateLabel(e.date)}</td>
                  <td>
                    {e.title}
                    <small>
                      {e.paymentId
                        ? "Baixa empresarial vinculada · " +
                          e.paymentId.slice(0, 8)
                        : "Lançamento manual privado"}
                    </small>
                  </td>
                  <td>
                    {p.categories.find((c) => c.id === e.categoryId)?.name}
                    <small>
                      {e.sourceId === "grupo-cr"
                        ? "Empresa do Grupo C&R"
                        : p.sources.find((s) => s.id === e.sourceId)?.name ||
                          "Sem fonte"}
                    </small>
                  </td>
                  <td>{p.accounts.find((a) => a.id === e.accountId)?.name}</td>
                  <td
                    className={e.kind === "receita" ? "positive" : "negative"}
                  >
                    {e.kind === "receita" ? "+" : "−"} {money(e.amount)}
                  </td>
                  <td>
                    {!e.paymentId && (
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            open(
                              "Editar lançamento pessoal",
                              [
                                field("title", "Título", e.title),
                                moneyField(
                                  "amount",
                                  "Valor (R$)",
                                  (e.amount / 100).toFixed(2),
                                ),
                                dateField("date", "Data", e.date),
                                select(
                                  "categoryId",
                                  "Minha categoria",
                                  categories,
                                  e.categoryId,
                                ),
                                select(
                                  "sourceId",
                                  "Minha fonte",
                                  [option("", "Sem fonte"), ...sources],
                                  e.sourceId,
                                ),
                              ],
                              (d) =>
                                personalMutate("edit", {
                                  ...d,
                                  id: e.id,
                                  amount: cents(d.amount),
                                }),
                            )
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            open(
                              "Excluir lançamento pessoal",
                              [],
                              () => personalMutate("delete", { id: e.id }),
                              "Somente registros manuais do seu titular podem ser excluídos.",
                            )
                          }
                        >
                          Excluir
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </Table>
          {!p.entries.length && (
            <Empty text="Seu espaço está pronto. Cadastre uma entrada ou uma saída pessoal." />
          )}
        </Section>
        <div className="dashboard-grid">
          <Section title="Minhas categorias">
            <div className="tags">
              {p.categories.map((c) => (
                <span key={c.id}>
                  {c.name} · {c.kind}
                </span>
              ))}
            </div>
          </Section>
          <Section title="Minhas fontes externas">
            <div className="tags">
              {p.sources.map((s) => (
                <span key={s.id}>{s.name}</span>
              ))}
            </div>
          </Section>
        </div>
        <Section title="Minhas contas">
          <Table heads={["Conta", "Saldo atual"]}>
            {p.accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>
                  {money(
                    a.opening +
                      p.entries
                        .filter(
                          (e) => e.accountId === a.id && e.date <= today(),
                        )
                        .reduce(
                          (n, e) =>
                            n + (e.kind === "receita" ? e.amount : -e.amount),
                          0,
                        ),
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <Button
            variant="outline"
            onClick={() =>
              open(
                "Redefinir meu espaço",
                [],
                () => personalMutate("reset"),
                "Redefine somente seus dados pessoais. Vínculos empresariais serão reconstruídos, sem duplicar baixas.",
              )
            }
          >
            Redefinir meus dados
          </Button>
        </Section>
      </>
    );
  }
  const content =
    page === "dashboard"
      ? dashboard()
      : page === "lancamentos"
        ? entriesPage()
        : page === "contas"
          ? accountsPage()
          : page === "fluxo"
            ? flowPage()
            : page === "dre"
              ? drePage()
              : page === "projetos"
                ? projectsPage()
                : page === "pessoas"
                  ? peoplePage()
                  : page === "socios"
                    ? partnersPage()
                    : page === "fechamento"
                      ? closingPage()
                      : page === "pessoal"
                        ? personalPage()
                        : settingsPage();
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "visible" : "")}>
        <Link className="brand" href="/">
          <span className="brand-mark">
            C&R<span>↗</span>
          </span>
          <div>
            GRUPO C&R<b>DIGITAL</b>
          </div>
        </Link>
        <button
          className="mobile-close"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace-picker">
          <span className="workspace-icon">
            <BuildingIcon />
          </span>
          <span>
            <b>Grupo C&R Digital</b>
            <small>Gestão financeira</small>
          </span>
          <ChevronRight size={15} />
        </div>
        <div className="mode-switch">
          <Link href="/" className={page !== "pessoal" ? "active" : ""}>
            Empresas
          </Link>
          <Link href="/pessoal" className={page === "pessoal" ? "active" : ""}>
            Meu Financeiro
          </Link>
        </div>
        <span className="nav-label">PRINCIPAL</span>
        <nav>
          {nav.map(([id, label, Icon], i) => (
            <Link
              className={
                (page === id ? "active" : "") + (i === 5 ? " nav-break" : "")
              }
              key={id}
              href={"/" + id}
              onClick={() => setMobile(false)}
            >
              <Icon size={18} />
              {label}
              {id === "lancamentos" && (
                <span className="nav-count">
                  {
                    s.entries.filter((e) => !e.cancelled && remaining(s, e) > 0)
                      .length
                  }
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="demo-info">
            <span className="demo-dot" />
            <div>
              <b>Modo demonstração</b>
              <small>Dados fictícios · Etapa 1</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">{user[0].toUpperCase()}</span>
            <div>
              <b>{user === "rafael" ? "Rafael" : "Claudecir"}</b>
              <small>Administrador</small>
            </div>
            <button
              aria-label="Sair da sessão"
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                window.location.href = "/login";
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Financeiro <ChevronRight size={14} />
            <b>{title}</b>
          </div>
          <div className="topbar-right">
            <span className="badge">
              <span className="demo-dot" />
              Demonstração
            </span>
            <span className="avatar small">{user[0].toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "dashboard"
                  ? "SEU GRUPO, EM NÚMEROS"
                  : page === "pessoal"
                    ? "ESPAÇO PRIVADO"
                    : "GESTÃO FINANCEIRA"}
              </div>
              <h1>
                {title}
                <span className="title-dot">.</span>
              </h1>
              <p>
                {page === "dashboard"
                  ? `Olá, ${user === "rafael" ? "Rafael" : "Claudecir"}. Aqui está o panorama financeiro do seu grupo.`
                  : page === "pessoal"
                    ? "Mais clareza para suas finanças, com privacidade."
                    : "Informação organizada para acompanhar cada próximo passo."}
              </p>
            </div>
            {page !== "pessoal" && (
              <Button onClick={() => newEntry()}>
                <Plus size={17} />
                Novo lançamento
              </Button>
            )}
          </div>
          <div className="scope-bar">
            <div>
              {page !== "pessoal" && (
                <>
                  <label>
                    <BuildingIcon />
                    <select
                      aria-label="Filtrar empresa"
                      value={
                        projectId
                          ? selectedProject?.companyId || company
                          : company
                      }
                      disabled={Boolean(projectId)}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setProject("");
                      }}
                    >
                      <option value="">Todas as empresas</option>
                      {companies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <Layers size={15} />
                    <select
                      aria-label="Filtrar projeto"
                      value={projectId || project}
                      disabled={Boolean(projectId)}
                      onChange={(e) => setProject(e.target.value)}
                    >
                      <option value="">Todos os projetos</option>
                      {s.projects
                        .filter(
                          (p) =>
                            !(projectId
                              ? selectedProject?.companyId
                              : company) ||
                            p.companyId ===
                              (projectId
                                ? selectedProject?.companyId
                                : company),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}
            </div>
            <label>
              <CalendarDays size={15} />
              <select
                aria-label="Período dos indicadores"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {["1", "3", "6", "12"].map((m) => (
                  <option value={m} key={m}>
                    Últimos {m} {m === "1" ? "mês" : "meses"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Fechar erro" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              <button
                aria-label="Fechar confirmação"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {content}
          <footer className="page-footer">
            <span>
              Grupo C&R Digital <span>·</span> Clareza para crescer.
            </span>
            <small>Dados de demonstração · BRL · America/Sao_Paulo</small>
          </footer>
        </main>
      </div>
      {modal && (
        <FormModal
          key={modal.title}
          spec={modal}
          close={() => setModal(null)}
        />
      )}
    </div>
  );
}
function BuildingIcon() {
  return <Landmark size={16} />;
}
