import Workspace from "@/components/workspace";
import { currentUser } from "@/lib/session";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const valid = [
    "dashboard",
    "lancamentos",
    "contas",
    "fluxo",
    "dre",
    "projetos",
    "pessoas",
    "socios",
    "fechamento",
    "configuracoes",
    "pessoal",
  ];
  if (
    path.length > 2 ||
    (path.length && !valid.includes(path[0])) ||
    (path.length === 2 && path[0] !== "projetos")
  )
    notFound();
  return (
    <Workspace
      user={(await currentUser())!}
      page={path[0] || "dashboard"}
      projectId={path[1]}
    />
  );
}
