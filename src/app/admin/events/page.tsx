import Link from "next/link";
import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { DataTable, StatusChip, Mono, EditLink } from "@/components/admin/kit";
import { formatDate, formatTime } from "@/lib/format";
import type { Status } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function EventsList() {
  const actor = await guard("content.create");
  const rows = await db
    .select({
      id: events.id, title: events.title, startsAt: events.startsAt, location: events.location,
      status: events.status,
      registrations: sql<number>`(select count(*)::int from ${eventRegistrations} r where r.event_id = ${events.id})`,
    })
    .from(events).where(isNull(events.deletedAt)).orderBy(desc(events.startsAt));

  return (
    <Shell actor={actor} active="/admin/events" title="Events"
      actions={<Link href="/admin/events/new" className="btn btn-primary btn-sm">+ New event</Link>}>
      <DataTable
        columns={["Event", "When", "Where", "Registrations", "Status", ""]}
        rows={rows.map((e) => [
          <b key="t" className="font-semibold">{e.title}</b>,
          <span key="w"><Mono>{formatDate(e.startsAt)}</Mono><div className="text-[0.76rem] text-[var(--color-ink-3)]">{formatTime(e.startsAt)}</div></span>,
          e.location,
          <Mono key="r">{e.registrations}</Mono>,
          <StatusChip key="st" status={e.status as Status} />,
          <EditLink key="e" href={`/admin/events/${e.id}`} />,
        ])}
        empty={{
          title: "No events yet",
          body: "Clean-up days, workshops and training sessions appear on the public site with their date, time, location and a registration link.",
          action: <Link href="/admin/events/new" className="btn btn-primary btn-sm">Create the first event</Link>,
        }}
      />
    </Shell>
  );
}
