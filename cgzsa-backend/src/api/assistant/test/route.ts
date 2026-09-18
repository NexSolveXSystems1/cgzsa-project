import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth";
import { ask } from "@/lib/assistant";
import { getAssistantSettings } from "@/lib/settings";

export const runtime = "nodejs";

/** The test box on the assistant screen. Never reaches a visitor. */
export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor || !actor.permissions.has("assistant.configure")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question || question.length > 500) return NextResponse.json({ error: "Ask a question." }, { status: 400 });

  const cfg = await getAssistantSettings();
  const started = Date.now();
  const answer = await ask(question, {
    enabled: true,
    restrictToContent: true,
    showSources: true,
    handOverWhenUnsure: cfg.handOverWhenUnsure,
    confidenceThreshold: cfg.confidenceThreshold,
    maxRepliesPerConversation: cfg.maxRepliesPerConversation,
    neverDiscuss: cfg.neverDiscuss,
    handoverMessage: cfg.handoverMessage,
    assistantName: cfg.assistantName,
  });
  return NextResponse.json({ ...answer, ms: Date.now() - started });
}
