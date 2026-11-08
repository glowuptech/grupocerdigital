import type { State, UserId, Entry, Contract, Composition } from "./model";
import { uid, integer, today } from "./finance";
import {
  addEntry,
  settle,
  reverse,
  cancel,
  transfer,
  reallocate,
  generateContracts,
  addContract,
  addComposition,
  closeMonth,
  audit,
} from "./operations";
// Commands are validated at this boundary; interfaces never write persisted state directly.
export function command(
  s: State,
  user: UserId,
  type: string,
  p: Record<string, unknown>,
) {
  const str = (key: string) => String(p[key] ?? "");
  const num = (key: string) => Number(p[key]);
  switch (type) {
    case "entry":
      addEntry(
        s,
        { ...p, id: uid(), cancelled: false } as unknown as Entry,
        str("end") || undefined,
      );
      break;
    case "recognize": {
      const e = s.entries.find((e) => e.id === str("id"));
      if (!e || e.cancelled) throw Error("Lançamento inválido.");
      e.recognized = true;
      break;
    }
    case "settle":
      settle(s, str("entryId"), num("amount"), str("accountId"), str("date"));
      break;
    case "reverse":
      reverse(s, str("id"), str("date"));
      break;
    case "cancel":
      cancel(s, str("id"));
      break;
    case "transfer":
      transfer(
        s,
        str("from"),
        str("to"),
        num("amount"),
        str("date"),
        str("nature"),
      );
      break;
    case "reallocate":
      reallocate(s, str("from"), str("to"), num("amount"), str("date"));
      break;
    case "reconcile": {
      const payment = s.payments.find((x) => x.id === str("id"));
      if (!payment) throw Error("Baixa inexistente.");
      payment.reconciled = !payment.reconciled;
      break;
    }
    case "company": {
      const name = str("name").trim(),
        cnpj = str("cnpj").replace(/\D/g, "");
      if (
        !name ||
        (cnpj.length !== 14 && cnpj.length !== 0) ||
        (cnpj && s.companies.some((c) => c.cnpj.replace(/\D/g, "") === cnpj))
      )
        throw Error(
          "Razão social obrigatória; CNPJ deve ter 14 dígitos e ser único, ou ficar pendente.",
        );
      s.companies.push({ id: uid(), name, cnpj, tradeName: str("tradeName") });
      break;
    }
    case "account":
      if (
        !s.companies.some((c) => c.id === str("companyId")) ||
        !str("name").trim() ||
        !Number.isSafeInteger(num("opening"))
      )
        throw Error("Conta inválida.");
      s.accounts.push({
        id: uid(),
        companyId: str("companyId"),
        name: str("name"),
        opening: num("opening"),
      });
      break;
    case "project":
      if (
        !str("name").trim() ||
        !s.companies.some((c) => c.id === str("companyId")) ||
        !Number.isSafeInteger(num("opening")) ||
        !str("start")
      )
        throw Error("Projeto inválido.");
      s.projects.push({
        id: uid(),
        name: str("name"),
        companyId: str("companyId"),
        start: str("start"),
        opening: num("opening"),
        reserve: 0,
        archived: false,
      });
      break;
    case "project-edit": {
      const project = s.projects.find((x) => x.id === str("id"));
      if (!project || !str("name").trim()) throw Error("Projeto inválido.");
      project.name = str("name");
      project.archived = Boolean(p.archived);
      break;
    }
    case "reserve": {
      if (!Number.isSafeInteger(num("amount")) || num("amount") < 0)
        throw Error("Reserva inválida.");
      if (str("projectId")) {
        const project = s.projects.find((x) => x.id === str("projectId"));
        if (!project) throw Error("Projeto inválido.");
        project.reserve = num("amount");
      } else {
        if (!s.companies.some((c) => c.id === str("companyId")))
          throw Error("Empresa inválida.");
        s.generalReserves[str("companyId")] = num("amount");
      }
      break;
    }
    case "person":
      if (!str("name").trim()) throw Error("Informe o nome.");
      s.people.push({
        id: uid(),
        name: str("name"),
        cpf: str("cpf"),
        rg: str("rg"),
      });
      break;
    case "contract":
      addContract(s, { ...p, id: uid() } as unknown as Contract);
      break;
    case "generate-contracts":
      generateContracts(s, str("month"));
      break;
    case "composition":
      addComposition(s, { ...p, id: uid() } as unknown as Composition);
      break;
    case "closing":
      closeMonth(
        s,
        str("companyId"),
        str("month"),
        num("approved"),
        str("note"),
      );
      break;
    case "reopen": {
      if (!str("note").trim()) throw Error("Informe o motivo da reabertura.");
      const closing = s.closings.find((c) => c.id === str("id"));
      if (!closing) throw Error("Fechamento inexistente.");
      closing.status = "reaberto";
      closing.note += " | Reabertura: " + str("note");
      break;
    }
    case "attachment": {
      const c = s.contracts.find((c) => c.id === str("id"));
      if (
        !c ||
        !str("name").trim() ||
        str("data").length > 700000 ||
        !/^data:(application\/pdf|text\/plain);base64,/.test(str("data"))
      )
        throw Error("Documento inválido.");
      c.attachments.push({ name: str("name"), data: str("data") });
      break;
    }
    case "category":
      if (!str("name").trim() || s.categories.includes(str("name")))
        throw Error("Categoria vazia ou duplicada.");
      s.categories.push(str("name"));
      break;
    default:
      throw Error("Operação desconhecida.");
  }
  audit(
    s,
    user,
    type,
    JSON.stringify(type === "attachment" ? { id: p.id, name: p.name } : p),
  );
}
