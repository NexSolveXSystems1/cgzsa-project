import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { guard } from "@/lib/guard";
import { listSessions } from "@/lib/auth";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { TotpSetup } from "@/components/admin/TotpSetup";
import { changePassword } from "./actions";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Account() {
  const actor = await guard();
  const [me] = await db.select().from(users).where(eq(users.id, actor.id));
  const sessions = await listSessions(actor.id);

  return (
    <Shell actor={actor} active="/admin/account" title="Your account">
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <div className="grid gap-5">
          <Panel title="Password">
            <SaveForm action={changePassword} label="Change password">
              <Field id="current" label="Current password" required>
                <input id="current" name="current" type="password" autoComplete="current-password" className="input" required />
              </Field>
              <Field id="next" label="New password" required
                hint="At least twelve characters. Checked against a list of easily guessed strings.">
                <input id="next" name="next" type="password" autoComplete="new-password" className="input" required />
              </Field>
            </SaveForm>
          </Panel>

          <Panel title="Two-factor authentication">
            <TotpSetup enabled={me.totpEnabled} email={me.email} />
          </Panel>
        </div>

        <Panel title="Active sessions">
          <Note title="Sessions are rows in the database">
            That is what makes it possible to end one without waiting for it to expire.
          </Note>
          {sessions.map((s) => (
            <div key={s.id} className="py-2 border-b border-[var(--color-line)] last:border-0 text-[0.83rem]">
              <div className="flex justify-between gap-3">
                <span className="font-mono text-[0.78rem]">{s.ip ?? "unknown address"}</span>
                <span className="text-[var(--color-ink-3)]">{formatDate(s.lastSeen)} {formatTime(s.lastSeen)}</span>
              </div>
              <div className="text-[0.76rem] text-[var(--color-ink-3)] truncate">{s.userAgent ?? "—"}</div>
            </div>
          ))}
        </Panel>
      </div>
    </Shell>
  );
}
