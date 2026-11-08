"use client";
import { useState } from "react";
import { ArrowUpRight, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Login() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(user: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });
      if (!r.ok) throw Error(r.status === 403 ? "O endereço de acesso não foi reconhecido. Abra o endereço principal da aplicação e tente novamente." : `Não foi possível iniciar a sessão (erro ${r.status}). Tente novamente.`);
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            C&R<span>↗</span>
          </span>
          <div>
            GRUPO C&R <b>DIGITAL</b>
          </div>
        </div>
        <div>
          <span className="eyebrow">CLAREZA PARA CRESCER</span>
          <h1>
            Todos os projetos.
            <br />
            Uma visão de futuro.
          </h1>
          <p>
            O financeiro que conecta as empresas, as pessoas e os próximos
            passos do grupo.
          </p>
          <div className="login-visual">
            <Building2 size={34} />
            <span>
              Uma gestão conectada
              <br />
              <b>Decisões com mais clareza.</b>
            </span>
            <ArrowUpRight />
          </div>
        </div>
        <small>Grupo C&R Digital · Gestão financeira</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="badge">AMBIENTE DEMONSTRATIVO</span>
          <h2>Bem-vindo ao grupo.</h2>
          <p>Escolha uma conta para explorar o financeiro.</p>
          {["rafael", "claudecir"].map((u, i) => (
            <button
              className="login-user"
              key={u}
              disabled={busy}
              onClick={() => login(u)}
            >
              <span className={"avatar " + (i ? "green" : "")}>
                {u[0].toUpperCase()}
              </span>
              <span>
                <b>{u === "rafael" ? "Rafael" : "Claudecir"}</b>
                <small>Administrador · conta demonstrativa</small>
              </span>
              <ArrowUpRight size={20} />
            </button>
          ))}
          <div className="notice">
            <ShieldCheck size={20} />
            <p>
              Somente dados fictícios. Não informe credenciais, documentos ou
              dados bancários reais.
            </p>
          </div>
          {error && <p role="alert">{error}</p>}
          <small>A sessão de demonstração expira em 24 horas.</small>
          <Button
            variant="ghost"
            onClick={() => login("rafael")}
            disabled={busy}
          >
            Explorar como Rafael <ArrowUpRight size={16} />
          </Button>
        </div>
      </section>
    </main>
  );
}
