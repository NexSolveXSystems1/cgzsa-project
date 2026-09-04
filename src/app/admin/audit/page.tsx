import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getActor } from "@/lib/auth";
import { Shell } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

export default async function Audit() {
  const actor = await getActor();
  if (!actor) redirect("/admin");
  if (!actor.permissions.has("audit.read")) redirect("/admin/dashboard");

  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);

  return (
    <Shell actor={actor} active="/admin/audit" title="Audit log">
      <div className="rounded-r-lg border border-l-[3px] border-[var(--color-line)] border-l-[var(--color-brand)] bg-white px-5 py-4 mb-6">
        <p className="font-bold text-[0.87rem] m-0 mb-1.5">Append-only</p>
        <p className="m-0 text-[0.875rem] text-[var(--color-ink-2)]">
          Entries cannot be edited or deleted from this interface. Passwords, tokens and session identifiers are never
          written to the log.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-[0.86rem] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--color-surface-2)] text-left">
              {["Timestamp", "Actor", "Action", "Resource", "IP", "Detail"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-line)]">
                <td className="px-4 py-2.5 font-mono text-[0.76rem] whitespace-nowrap">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-2.5">{r.actorLabel}</td>
                <td className="px-4 py-2.5">
                  <span className={"chip chip-none font-mono normal-case tracking-normal " + (r.action.includes("failed") ? "chip-bad" : "chip-ok")}>{r.action}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[0.78rem]">{r.resource}</td>
                <td className="px-4 py-2.5 font-mono text-[0.76rem] text-[var(--color-ink-3)]">{r.ip ?? "—"}</td>
                <td className="px-4 py-2.5 text-[0.8rem] text-[var(--color-ink-2)]">{r.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
