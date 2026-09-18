import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, conversations } from "@/db/schema";
import { guard } from "@/lib/guard";
import { Shell } from "@/components/admin/Shell";
import { Panel, Field, Row2, Note } from "@/components/admin/kit";
import { SaveForm } from "@/components/admin/SaveForm";
import { AssistantTester } from "@/components/admin/AssistantTester";
import { getAssistantSettings } from "@/lib/settings";
import { saveAssistantSettings } from "@/app/admin/settings/actions";

export const dynamic = "force-dynamic";

export default async function AssistantSettings() {
  const actor = await guard("assistant.configure");
  const a = await getAssistantSettings();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [[convos], [answered], [handed], [escalated]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(conversations).where(gte(conversations.startedAt, monthStart)),
    db.select({ n: sql<number>`count(*)::int` }).from(chatMessages)
      .where(and(eq(chatMessages.author, "ASSISTANT"), gte(chatMessages.createdAt, monthStart))),
    db.select({ n: sql<number>`count(*)::int` }).from(conversations)
      .where(and(gte(conversations.startedAt, monthStart), eq(conversations.status, "ASSIGNED"))),
    db.select({ n: sql<number>`count(*)::int` }).from(conversations)
      .where(and(gte(conversations.startedAt, monthStart), eq(conversations.status, "ESCALATED"))),
  ]);

  const toggle = (name: string, title: string, sub: string, on: boolean, locked = false) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--color-line)] last:border-0">
      <div>
        <b className="block text-[0.88rem]">{title}</b>
        <span className="text-[0.78rem] text-[var(--color-ink-3)]">{sub}</span>
      </div>
      <label className="shrink-0">
        <input type="checkbox" name={name} defaultChecked={on} disabled={locked} className="w-4 h-4" />
        <span className="sr-only">{title}</span>
      </label>
    </div>
  );

  return (
    <Shell actor={actor} active="/admin/chat/assistant" title="AI assistant">
      <Note tone="warn" title="The assistant speaks for CGZSA">
        It can only repeat what you have published. If a page is wrong, the assistant will be wrong. Review the
        questions it could not answer on the knowledge base screen each week.
      </Note>

      <SaveForm action={saveAssistantSettings}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="grid gap-5">
            <Panel title="Behaviour">
              {toggle("enabled", "Assistant answers visitors", "When off, chat goes straight to the staff queue.", a.enabled)}
              <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--color-line)]">
                <div>
                  <b className="block text-[0.88rem]">Answer only from CGZSA content</b>
                  <span className="text-[0.78rem] text-[var(--color-ink-3)]">
                    Enforced in the system, not a setting. The assistant may quote your pages, programmes, FAQs and
                    documents, and nothing else.
                  </span>
                </div>
                <span className="chip chip-ok shrink-0">Always on</span>
              </div>
              {toggle("showSources", "Show the sources of every answer", "Each reply lists the pages it came from, so a visitor can check it.", a.showSources)}
              {toggle("handOverWhenUnsure", "Hand over when unsure", "Below the confidence threshold it offers a person instead of guessing.", a.handOverWhenUnsure)}
              {toggle("captureEmailOutOfHours", "Take an email address out of hours", "Creates a contact message for staff to answer the next working day.", a.captureEmailOutOfHours)}
            </Panel>

            <Panel title="Voice">
              <Row2>
                <Field id="assistantName" label="Assistant name" required>
                  <input id="assistantName" name="assistantName" defaultValue={a.assistantName} className="input" required />
                </Field>
                <Field id="tone" label="Tone">
                  <select id="tone" name="tone" className="input" defaultValue={a.tone}>
                    <option>Plain and factual</option>
                    <option>Warm and encouraging</option>
                    <option>Formal</option>
                  </select>
                </Field>
              </Row2>
              <Field id="greeting" label="Opening message" required>
                <textarea id="greeting" name="greeting" rows={3} defaultValue={a.greeting} className="input" required />
              </Field>
              <Field id="handoverMessage" label="Message when handing over to a person" required>
                <textarea id="handoverMessage" name="handoverMessage" rows={3} defaultValue={a.handoverMessage} className="input" required />
              </Field>
              <Field id="neverDiscuss" label="Never discuss" hint="Comma separated. The assistant declines and offers a person instead.">
                <input id="neverDiscuss" name="neverDiscuss" defaultValue={a.neverDiscuss.join(", ")} className="input" />
              </Field>
            </Panel>

            <Panel title="Try it" actions={<span className="chip chip-mute chip-none">Does not reach visitors</span>}>
              <AssistantTester />
            </Panel>
          </div>

          <div className="grid gap-5">
            <Panel title="Office hours">
              <Row2>
                <Field id="officeOpen" label="Open"><input id="officeOpen" name="officeOpen" type="time" defaultValue={a.officeOpen} className="input" /></Field>
                <Field id="officeClose" label="Close"><input id="officeClose" name="officeClose" type="time" defaultValue={a.officeClose} className="input" /></Field>
              </Row2>
              <Field id="officeDays" label="Days"><input id="officeDays" name="officeDays" defaultValue={a.officeDays} className="input" /></Field>
              <p className="hint">Outside these hours the assistant still answers, and takes an email address if it cannot help.</p>
            </Panel>

            <Panel title="Limits">
              <Field id="confidenceThreshold" label="Confidence threshold"
                hint="Below this the assistant offers a person rather than answering. 0 to 1.">
                <input id="confidenceThreshold" name="confidenceThreshold" type="number" step="0.05" min={0} max={1}
                  defaultValue={a.confidenceThreshold} className="input" />
              </Field>
              <Field id="maxRepliesPerConversation" label="Maximum replies per conversation"
                hint="Then it hands over. Stops a loop running up cost.">
                <input id="maxRepliesPerConversation" name="maxRepliesPerConversation" type="number" min={1} max={20}
                  defaultValue={a.maxRepliesPerConversation} className="input" />
              </Field>
              <Field id="monthlyCapUsd" label="Monthly spending cap (USD)"
                hint="The assistant switches off and chat goes to the queue if this is reached.">
                <input id="monthlyCapUsd" name="monthlyCapUsd" type="number" step="1" min={0}
                  defaultValue={a.monthlyCapUsd} className="input" />
              </Field>
            </Panel>

            <Panel title="This month">
              {([
                ["Conversations", String(convos.n)],
                ["Assistant replies", String(answered.n)],
                ["Taken by a person", String(handed.n)],
                ["Emails taken", String(escalated.n)],
                ["Spend against cap", `$${a.spentThisMonthUsd.toFixed(2)} of $${a.monthlyCapUsd.toFixed(0)}`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-[var(--color-line)] last:border-0 text-[0.83rem]">
                  <span>{k}</span><b className="font-semibold">{v}</b>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </SaveForm>
    </Shell>
  );
}
