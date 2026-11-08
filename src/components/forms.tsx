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
  advanced?: boolean;
  showWhen?: { field: string; value: string };
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
  const [values, setValues] = useState<Record<string, string>>({});
  const renderFields = (advanced: boolean) =>
    spec.fields
      .filter((f) => Boolean(f.advanced) === advanced)
      .map((f) => (
        <label
          key={f.name}
          hidden={Boolean(
            f.showWhen &&
            (values[f.showWhen.field] ??
              spec.fields.find((x) => x.name === f.showWhen!.field)?.value) !==
              f.showWhen.value,
          )}
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
                <option key={o.value} value={o.value}>
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
              min={f.type === "number" ? 0 : undefined}
              step={f.type === "number" ? 1 : undefined}
              defaultValue={f.value}
              required={f.required !== false}
            />
          )}
          {f.hint && <small>{f.hint}</small>}
        </label>
      ));
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
          onChange={(e) => {
            const target = e.target as unknown as HTMLInputElement;
            setValues((v) => ({ ...v, [target.name]: target.value }));
          }}
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
          <div className="form-grid">{renderFields(false)}</div>
          {spec.fields.some((f) => f.advanced) && (
            <details className="advanced-form">
              <summary>Mais opções (opcional)</summary>
              <div className="form-grid">{renderFields(true)}</div>
            </details>
          )}
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
