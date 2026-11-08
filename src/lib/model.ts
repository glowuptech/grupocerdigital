export type UserId = "rafael" | "claudecir";
export type Kind =
  | "receita"
  | "despesa"
  | "distribuicao"
  | "adiantamento"
  | "aporte"
  | "devolucao";
export type DreClass =
  | "receita"
  | "deducao"
  | "custo"
  | "operacional"
  | "financeiro"
  | "tributo"
  | "fora";
export interface Company {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
}
export interface Project {
  id: string;
  companyId: string;
  name: string;
  start: string;
  opening: number;
  reserve: number;
  archived: boolean;
}
export interface Account {
  id: string;
  companyId: string;
  name: string;
  opening: number;
}
export interface Allocation {
  projectId: string;
  amount: number;
}
export interface Entry {
  id: string;
  companyId: string;
  projectId: string;
  kind: Kind;
  category: string;
  title: string;
  description: string;
  amount: number;
  competence: string;
  due: string;
  recognized: boolean;
  cancelled: boolean;
  allocations: Allocation[];
  personId?: string;
  contractId?: string;
  advanceId?: string;
  seriesId?: string;
  dre: DreClass;
}
export interface Payment {
  id: string;
  entryId: string;
  amount: number;
  accountId: string;
  date: string;
  reversalOf?: string;
  reconciled: boolean;
  allocations?: Allocation[];
}
export interface Transfer {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  nature: string;
}
export interface Reallocation {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
}
export interface Person {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  userId?: UserId;
}
export interface Attachment {
  name: string;
  data: string;
}
export interface Contract {
  id: string;
  personId: string;
  projectId: string;
  companyId: string;
  type: "CLT" | "PJ";
  cnpj: string;
  start: string;
  end: string;
  amount: number;
  day: number;
  attachments: Attachment[];
  previousId?: string;
}
export interface Composition {
  id: string;
  projectId: string;
  start: string;
  end: string;
  shares: { personId: string; bps: number }[];
}
export interface Closing {
  id: string;
  companyId: string;
  month: string;
  profit: number;
  approved: number;
  distributionIds: string[];
  compositions: Composition[];
  allocations: {
    projectId: string;
    profit: number;
    groupShare: number;
    externalShare: number;
  }[];
  status: "fechado" | "reaberto";
  note: string;
}
export interface Audit {
  id: string;
  actor: UserId;
  at: string;
  action: string;
  detail: string;
}
export interface PersonalCategory {
  id: string;
  name: string;
  kind: "receita" | "despesa";
}
export interface PersonalEntry {
  id: string;
  title: string;
  amount: number;
  kind: "receita" | "despesa";
  date: string;
  categoryId: string;
  sourceId: string;
  accountId: string;
  paymentId?: string;
}
export interface Personal {
  accounts: { id: string; name: string; opening: number }[];
  categories: PersonalCategory[];
  sources: { id: string; name: string }[];
  entries: PersonalEntry[];
}
export interface State {
  version: 1;
  companies: Company[];
  projects: Project[];
  accounts: Account[];
  entries: Entry[];
  payments: Payment[];
  transfers: Transfer[];
  reallocations: Reallocation[];
  people: Person[];
  contracts: Contract[];
  compositions: Composition[];
  closings: Closing[];
  categories: string[];
  generalReserves: Record<string, number>;
  audit: Audit[];
}
export interface Scope {
  companyId?: string;
  projectId?: string;
}
