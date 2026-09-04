import { desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { volunteerApplications } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, Mono, Note } from "@/components/admin/kit";
import { MessageActions } from "@/components/admin/MessageActions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHIP: Record<string, string> = { UNREAD: "chip-bad", READ: "chip-info", REPLIED: "chip-ok", ARCHIVED: "chip-mute" };

export default async function Volunteers() {
  const actor = await guard("messages.read");
  const rows = await db.select().from(volunteerApplications)
    .where(isNull(volunteerApplications.deletedAt)).orderBy(desc(volunteerApplications.createdAt));

  return (
    <Shell actor={actor} active="/admin/volunteers" title="Volunteer applications">
      <Note title="Personal data">
        Applications are kept while a volunteer&rsquo;s involvement is current, and for twelve months afterwards.
        Many applicants are young; treat these records accordingly.
      </Note>
      <DataTable
        columns={["Applicant", "Interest", "County", "Received", "Status", ""]}
        rows={rows.map((v) => [
          <span key="n"><b className="font-semibold">{v.firstName} {v.lastName}</b>
            <div className="text-[0.78rem] text-[var(--color-ink-3)]">
              <a href={`mailto:${v.email}`}>{v.email}</a>{v.phone ? ` · ${v.phone}` : ""}
            </div></span>,
          <span key="i">{v.interest}{v.note && <div className="text-[0.76rem] text-[var(--color-ink-3)] max-w-[40ch]">{v.note}</div>}</span>,
          v.county ?? "—",
          <Mono key="d">{formatDate(v.createdAt)}</Mono>,
          <span key="s" className={"chip " + CHIP[v.status]}>{v.status.toLowerCase()}</span>,
          <MessageActions key="a" id={v.id} kind="application" status={v.status} />,
        ])}
        empty={{
          title: "No applications yet",
          body: "Applications from the volunteer page arrive here with the applicant's contact details, chosen area and county.",
        }}
      />
    </Shell>
  );
}
