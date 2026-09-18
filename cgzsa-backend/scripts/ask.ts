import "dotenv/config";
import { ask } from "../src/lib/assistant";

const cfg = {
  enabled: true, restrictToContent: true, showSources: true, handOverWhenUnsure: true,
  confidenceThreshold: 0.75, maxRepliesPerConversation: 6,
  neverDiscuss: ["Individual donor amounts", "Staff personal details", "Ongoing legal matters"],
  handoverMessage: "I could not find that in our published information, so I do not want to guess. I can pass this to the team — they answer within one working day.",
  assistantName: "CGZSA Assistant",
};

async function main() {
  const qs = process.argv.slice(2).length ? process.argv.slice(2) : [
    "Do you install water taps in Paynesville?",
    "How much does it cost to sponsor a tap?",
    "Where is your office?",
    "Is CGZSA registered?",
    "What do you do about waste?",
    "Who is your biggest donor and how much did they give?",
  ];
  for (const q of qs) {
    const a = await ask(q, cfg);
    console.log("\nQ: " + q);
    console.log("A: " + a.body.slice(0, 260));
    console.log("   conf=" + a.confidence.toFixed(2) + "  handover=" + a.handover + "  sources: " + (a.sources.map((s) => s.title).join(" | ") || "—"));
  }
  process.exit(0);
}
main();
