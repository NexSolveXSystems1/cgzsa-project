import { asc } from "drizzle-orm";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { WorkflowBar } from "@/components/admin/WorkflowBar";
import { availableTransitions, type Status } from "@/lib/workflow";
import { saveFaq } from "./actions";

export const dynamic = "force-dynamic";

export default async function FaqsAdmin() {
  const actor = await guard("content.create");
  const rows = await db.select().from(faqs).orderBy(asc(faqs.order));

  return (
    <Shell actor={actor} active="/admin/faqs" title="FAQs">
      <Note title="Answers are indexed for the assistant">
        Publishing a question here adds it to what the live chat assistant can answer from. It is the fastest way to
        close a gap on the knowledge base screen.
      </Note>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="grid gap-4">
          {rows.map((f) => (
            <Panel key={f.id} title={`Question ${f.order + 1}`} actions={
              <WorkflowBar resource="faqs" id={f.id} status={f.status as Status}
                transitions={availableTransitions(f.status as Status, actor).slice(0, 1).map((t) => ({ to: t.to, label: t.label }))}
                canDelete={false} returnTo="/admin/faqs" />
            }>
              <SaveForm action={saveFaq.bind(null, f.id)}>
                <Field id={`q-${f.id}`} label="Question" required>
                  <input id={`q-${f.id}`} name="question" defaultValue={f.question} className="input" required />
                </Field>
                <Field id={`a-${f.id}`} label="Answer" required>
                  <textarea id={`a-${f.id}`} name="answer" rows={3} defaultValue={f.answer} className="input" required />
                </Field>
                <input type="hidden" name="order" value={f.order} />
              </SaveForm>
            </Panel>
          ))}
        </div>

        <Panel title="Add a question">
          <SaveForm action={saveFaq.bind(null, null)} label="Add">
            <Field id="nq" label="Question" required>
              <input id="nq" name="question" className="input" required />
            </Field>
            <Field id="na" label="Answer" required>
              <textarea id="na" name="answer" rows={4} className="input" required />
            </Field>
            <Field id="no" label="Order">
              <input id="no" name="order" type="number" min={0} defaultValue={rows.length} className="input" />
            </Field>
          </SaveForm>
        </Panel>
      </div>
    </Shell>
  );
}
