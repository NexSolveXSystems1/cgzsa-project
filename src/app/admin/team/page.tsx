import { asc, desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, teamMembers } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { saveTeamMember } from "./actions";

export const dynamic = "force-dynamic";

const GROUPS = ["Executive Team", "Board of Directors", "Departments", "Field Structure"];

export default async function TeamAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const actor = await guard("team.manage");
  const { edit } = await searchParams;

  const [rows, images] = await Promise.all([
    db.select().from(teamMembers).where(isNull(teamMembers.deletedAt)).orderBy(asc(teamMembers.order)),
    db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(40),
  ]);
  const editing = rows.find((r) => r.id === edit) ?? null;
  const vacant = rows.filter((r) => r.vacant).length;

  return (
    <Shell actor={actor} active="/admin/team" title="Team & departments">
      <Note title={`${rows.length} roles defined, ${vacant} awaiting an appointment`}>
        A role with no name is shown on the public site as &ldquo;appointment pending&rdquo; rather than being hidden,
        so the organisational structure stays honest while seats are filled.
      </Note>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="grid gap-4">
          {GROUPS.map((g) => {
            const members = rows.filter((r) => r.group === g);
            if (!members.length) return null;
            return (
              <Panel key={g} title={g}>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-[var(--color-line)] last:border-0">
                    <span className="grid place-items-center w-9 h-9 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[0.72rem] font-bold text-[var(--color-ink-3)] shrink-0">
                      {m.name ? m.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[0.87rem] font-semibold truncate">{m.name ?? m.role}</b>
                      <span className="text-[0.78rem] text-[var(--color-ink-3)]">{m.name ? m.role : "Appointment pending"}</span>
                    </span>
                    {m.vacant && <span className="chip chip-hold">Vacant</span>}
                    <a href={`/admin/team?edit=${m.id}`} className="btn btn-ghost btn-xs">Edit</a>
                  </div>
                ))}
              </Panel>
            );
          })}
        </div>

        <Panel title={editing ? `Edit: ${editing.role}` : "Add a role"}>
          <SaveForm action={saveTeamMember.bind(null, editing?.id ?? null)} label={editing ? "Save" : "Add"}>
            <Field id="role" label="Role" required>
              <input id="role" name="role" defaultValue={editing?.role ?? ""} className="input" required />
            </Field>
            <Field id="name" label="Name" hint="Leave blank while the seat is vacant.">
              <input id="name" name="name" defaultValue={editing?.name ?? ""} className="input" />
            </Field>
            <Row2>
              <Field id="group" label="Group">
                <select id="group" name="group" className="input" defaultValue={editing?.group ?? GROUPS[0]}>
                  {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field id="order" label="Order">
                <input id="order" name="order" type="number" min={0} defaultValue={editing?.order ?? rows.length} className="input" />
              </Field>
            </Row2>
            <Field id="duties" label="Duties" hint="One per line.">
              <textarea id="duties" name="duties" rows={5} defaultValue={(editing?.duties ?? []).join("\n")} className="input" />
            </Field>
            <Field id="biography" label="Biography">
              <textarea id="biography" name="biography" rows={4} defaultValue={editing?.biography ?? ""} className="input" />
            </Field>
            <Field label="Photograph">
              <ImagePicker name="photoId" images={images.map((i) => ({ id: i.id, alt: i.altText, key: i.storageKey }))} selected={editing?.photoId ?? null} />
            </Field>
          </SaveForm>
          {editing && <a href="/admin/team" className="btn btn-ghost btn-sm w-full mt-3">Cancel and add a new role</a>}
        </Panel>
      </div>
    </Shell>
  );
}
