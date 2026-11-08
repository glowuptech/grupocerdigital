"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
export interface Field {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}
export interface FormSpec {
  title: string;
  description?: string;
  fields: Field[];
  submit: (data: Record<string, string>) => Promise<void> | void;
}
export function FormModal({
  spec,
  close,
}: {
  spec: FormSpec;
  close: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <div>
            <h2 id="modal-title">{spec.title}</h2>
            {spec.description && <p>{spec.description}</p>}
          </div>
          <Button
            variant="ghost"
            aria-label="Fechar formulário"
            onClick={close}
          >
            <X size={20} />
          </Button>
        </header>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(
              new FormData(e.currentTarget),
            ) as Record<string, string>;
            setError("");
            setBusy(true);
            try {
              await spec.submit(d);
              close();
            } catch (err) {
              setError((err as Error).message);
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {spec.fields.map((f) => (
              <label
                key={f.name}
                className={f.type === "textarea" ? "wide" : ""}
              >
                {f.label}
                {f.options ? (
                  <select
                    aria-label={f.label}
                    name={f.name}
                    defaultValue={f.value}
                    required={f.required !== false}
                  >
                    {f.options.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    aria-label={f.label}
                    name={f.name}
                    defaultValue={f.value}
                    required={f.required !== false}
                  />
                ) : (
                  <input
                    aria-label={f.label}
                    name={f.name}
                    type={f.type || "text"}
                    defaultValue={f.value}
                    required={f.required !== false}
                    min={f.type === "number" ? 0 : undefined}
                    step={f.type === "number" ? 1 : undefined}
                  />
                )}{" "}
                {f.hint && <small>{f.hint}</small>}
              </label>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
