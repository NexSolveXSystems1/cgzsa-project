import Link from "next/link";
import { STATUS_CHIP, STATUS_LABEL, type Status } from "@/lib/workflow";

/* ─────────────────────────────── panels and headings */

export function Panel({
  title, actions, children, className = "",
}: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={"card overflow-hidden " + className}>
      {(title || actions) && (
        <header className="px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center gap-3">
          {title && <h3 className="font-sans text-[0.9rem] font-bold">{title}</h3>}
          <div className="flex-1" />
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Kpis({ items }: { items: [string, string | number, string?][] }) {
  return (
    <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))" }}>
      {items.map(([k, v, d]) => (
        <div key={k} className="card px-5 py-4">
          <div className="font-mono text-[0.73rem] uppercase tracking-[0.04em] text-[var(--color-ink-3)]">{k}</div>
          <div className="font-serif text-[2rem] font-bold leading-tight mt-1.5 tabular-nums">{v}</div>
          {d && <div className="text-[0.76rem] text-[var(--color-ink-3)] mt-0.5">{d}</div>}
        </div>
      ))}
    </div>
  );
}

export function Note({
  tone = "info", title, children,
}: { tone?: "info" | "warn" | "bad"; title: string; children: React.ReactNode }) {
  const border = tone === "warn" ? "border-l-[var(--color-warn)]" : tone === "bad" ? "border-l-[var(--color-danger)]" : "border-l-[var(--color-brand)]";
  const bg = tone === "warn" ? "bg-[var(--color-warn-soft)]" : tone === "bad" ? "bg-[var(--color-danger-soft)]" : "bg-white";
  return (
    <div className={`rounded-r-lg border border-l-[3px] border-[var(--color-line)] ${border} ${bg} px-5 py-4 mb-6`}>
      <p className="font-bold text-[0.87rem] m-0 mb-1.5">{title}</p>
      <div className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">{children}</div>
    </div>
  );
}

/* ─────────────────────────────── tables */

export function DataTable({
  columns, rows, empty,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  empty?: { title: string; body: string; action?: React.ReactNode };
}) {
  if (rows.length === 0 && empty) {
    return (
      <div className="card px-7 py-12 text-center">
        <h3 className="text-lg mb-2">{empty.title}</h3>
        <p className="text-[var(--color-ink-3)] text-[0.9rem] max-w-[52ch] mx-auto m-0">{empty.body}</p>
        {empty.action && <div className="mt-5">{empty.action}</div>}
      </div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-[0.86rem]" style={{ minWidth: `${Math.max(560, columns.length * 130)}px` }}>
        <thead>
          <tr className="bg-[var(--color-surface-2)] text-left">
            {columns.map((c, i) => (
              <th key={i} className="px-4 py-2.5 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--color-line)] hover:bg-[var(--color-surface-2)]">
              {r.map((cell, j) => (
                <td key={j} className={"px-4 py-2.5 align-middle " + (j === r.length - 1 ? "text-right whitespace-nowrap" : "")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusChip({ status }: { status: Status }) {
  return <span className={"chip " + STATUS_CHIP[status]}>{STATUS_LABEL[status]}</span>;
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.79rem] text-[var(--color-ink-3)]">{children}</span>;
}

export function EditLink({ href }: { href: string }) {
  return <Link href={href} className="btn btn-ghost btn-xs">Edit</Link>;
}

/* ─────────────────────────────── forms */

export function Field({
  id, label, required, hint, error, children,
}: {
  id?: string; label: string; required?: boolean; hint?: React.ReactNode; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="err" role="alert">{error}</div>}
    </div>
  );
}

export function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>;
}

export function Toolbar({
  search, filters, children,
}: { search?: string; filters?: { label: string; href: string; active: boolean }[]; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2.5 items-center mb-5">
      {search !== undefined && (
        <form className="contents" action="" method="get">
          <input name="q" defaultValue={search} placeholder="Search" aria-label="Search" className="input max-w-[240px]" />
        </form>
      )}
      {filters?.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          aria-current={f.active ? "true" : undefined}
          className={
            "rounded-full border px-3.5 py-1.5 text-[0.83rem] no-underline " +
            (f.active
              ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-semibold"
              : "bg-white border-[var(--color-line)] text-[var(--color-ink-2)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]")
          }
        >
          {f.label}
        </Link>
      ))}
      <div className="flex-1" />
      {children}
    </div>
  );
}
