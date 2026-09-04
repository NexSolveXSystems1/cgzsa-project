import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { permissions, rolePermissions, roles, users } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, Panel, Field, Mono, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { UserRow } from "@/components/admin/UserRow";
import { inviteUser } from "./actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Users() {
  const actor = await guard("users.manage");

  const [people, allRoles, matrix] = await Promise.all([
    db.select({
      id: users.id, name: users.name, email: users.email, status: users.status,
      totpEnabled: users.totpEnabled, lastLoginAt: users.lastLoginAt,
      roleId: users.roleId, roleLabel: roles.label, rank: roles.rank,
    }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).orderBy(desc(roles.rank), asc(users.name)),
    db.select().from(roles).orderBy(desc(roles.rank)),
    db.select({ role: roles.name, perm: permissions.key, label: permissions.label, group: permissions.group })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)),
  ]);

  const roleOrder = allRoles.map((r) => r.name);
  const permList = [...new Map(matrix.map((m) => [m.perm, { key: m.perm, label: m.label, group: m.group }])).values()];
  const held = new Set(matrix.map((m) => `${m.role}|${m.perm}`));

  return (
    <Shell actor={actor} active="/admin/users" title="Users & roles">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start mb-6">
        <DataTable
          columns={["Name", "Role", "Status", "2FA", "Last signed in", ""]}
          rows={people.map((u) => [
            <span key="n"><b className="font-semibold">{u.name}</b><div className="font-mono text-[0.76rem] text-[var(--color-ink-3)]">{u.email}</div></span>,
            u.roleLabel,
            <span key="s" className={"chip " + (u.status === "ACTIVE" ? "chip-ok" : u.status === "INVITED" ? "chip-info" : "chip-bad")}>{u.status.toLowerCase()}</span>,
            <span key="t" className={"chip chip-none " + (u.totpEnabled ? "chip-ok" : "chip-mute")}>{u.totpEnabled ? "On" : "Off"}</span>,
            <Mono key="l">{formatDate(u.lastLoginAt) || "Never"}</Mono>,
            <UserRow key="a" userId={u.id} roleId={u.roleId} status={u.status}
              roles={allRoles.map((r) => ({ id: r.id, label: r.label }))} isSelf={u.id === actor.id} />,
          ])}
        />

        <Panel title="Invite someone">
          <SaveForm action={inviteUser} label="Send invitation">
            <Field id="name" label="Name" required><input id="name" name="name" className="input" required /></Field>
            <Field id="email" label="Email" required><input id="email" name="email" type="email" className="input" required /></Field>
            <Field id="roleId" label="Role" required>
              <select id="roleId" name="roleId" className="input" required defaultValue="">
                <option value="" disabled>Choose a role</option>
                {allRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
            <p className="hint">
              The account is created as <b>invited</b>. Set a temporary password for them, or wait for the password
              reset flow.
            </p>
          </SaveForm>
        </Panel>
      </div>

      <Note title="Permissions are enforced on the server">
        The interface hides what a user cannot do, but hiding is cosmetic. Every request re-derives the actor&rsquo;s
        permissions from these rows and checks them before acting.
      </Note>

      <Panel title="Roles and permissions">
        <div className="overflow-x-auto">
          <table className="w-full text-[0.84rem] min-w-[720px]">
            <thead>
              <tr className="bg-[var(--color-surface-2)]">
                <th className="text-left px-3 py-2.5 font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">Capability</th>
                {allRoles.map((r) => (
                  <th key={r.id} className="px-3 py-2.5 text-center font-mono text-[0.66rem] tracking-[0.1em] uppercase text-[var(--color-ink-3)] font-medium">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permList.map((p) => (
                <tr key={p.key} className="border-t border-[var(--color-line)]">
                  <td className="px-3 py-2">{p.label}</td>
                  {roleOrder.map((rn) => (
                    <td key={rn} className="px-3 py-2 text-center">
                      {held.has(`${rn}|${p.key}`)
                        ? <span className="text-[var(--color-brand)] font-bold">✓</span>
                        : <span className="text-[var(--color-ink-3)]">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}
