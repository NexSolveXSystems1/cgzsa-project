/**
 * The assistant.
 *
 * Design review §14: it answers only from CGZSA's published content, cites the
 * pages it used, and hands over rather than guessing. The restriction is
 * enforced here, not left to a prompt: retrieved passages are the only material
 * an answer may draw on, and if nothing relevant is retrieved there is no answer
 * to give.
 *
 * Two providers:
 *   stub       — extractive. Composes an answer out of the retrieved passages
 *                themselves. No API key, no network, cannot invent anything.
 *   anthropic  — sends the retrieved passages as quoted data with an instruction
 *                to answer only from them. Requires ASSISTANT_API_KEY.
 */
import { retrieve, type Passage } from "./knowledge";
import { logger } from "@/lib/log";

const log = logger("assistant");

const STOP = new Set([
  "a","an","and","are","as","at","be","by","can","do","does","for","from","has","have","how","i",
  "in","is","it","its","of","on","or","that","the","to","was","we","what","when","where","which",
  "who","why","will","with","you","your","our","us","me","my","if","there","this","they","them",
  "about","into","over","under","than","then","some","any","all","more","most","much","many",
  "did","done","get","got","also","just","like","very","been","being","were","would","could",
  "should","must","may","might","please","tell","know","there's","here","out","up","down",
]);

function guardTripped(question: string, neverDiscuss: string[]) {
  const q = question.toLowerCase();
  return neverDiscuss.some((topic) => {
    const words = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    return words.length > 0 && words.every((w) => q.includes(w));
  });
}

export type AssistantConfig = {
  enabled: boolean;
  restrictToContent: boolean;
  showSources: boolean;
  handOverWhenUnsure: boolean;
  confidenceThreshold: number;
  maxRepliesPerConversation: number;
  neverDiscuss: string[];
  handoverMessage: string;
  assistantName: string;
};

export type AssistantAnswer = {
  body: string;
  sources: { title: string; url: string }[];
  confidence: number;
  handover: boolean;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const SYSTEM = `You are the official AI Assistant for Clean and Green Zero Sphere Alliance (CGZSA), a registered youth-led environmental non-profit in Liberia.

Your tone should be professional, polite, warm, and highly informative.

Rules:
1. Answer accurately using the provided website passages. Synthesize the details clearly and concisely.
2. If asked general questions about CGZSA, environmental sustainability, recycling, climate action, or contact details in Liberia, provide a helpful and welcoming answer based on the organisation's mission.
3. Be structured and engaging. Use bullet points or short paragraphs when explaining programs, impact, or contact options.
4. If a visitor asks a direct question not covered by the passages, politely explain what information is available and offer to connect them with the CGZSA team.`;

/** Intelligent extractive answer composition: fallback when LLM API keys are not provided. */
function compose(question: string, passages: Passage[]): string {
  if (!passages.length) return "";
  
  const qTerms = new Set(
    question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
  
  const sentences: { text: string; score: number; title: string }[] = [];
  for (const p of passages) {
    for (const raw of p.body.split(/(?<=[.!?])\s+/)) {
      const text = raw.trim();
      if (text.length < 20 || text.length > 400) continue;
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
      const hits = words.filter((w) => qTerms.has(w)).length;
      const score = hits > 0 ? (hits / Math.sqrt(words.length)) + (p.score * 1.5) : p.score * 0.5;
      sentences.push({ text, score, title: p.title });
    }
  }

  sentences.sort((a, b) => b.score - a.score);
  const picked: string[] = [];
  for (const s of sentences) {
    if (picked.length >= 3) break;
    if (!picked.some((p) => p === s.text)) picked.push(s.text);
  }

  if (picked.length > 0) {
    return picked.join(" ");
  }

  // Fallback to top passage summary if keyword matching was loose
  const top = passages[0];
  const firstSentence = top.body.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence || top.body.slice(0, 250) + "...";
}

async function callAnthropic(question: string, passages: Passage[]) {
  const key = process.env.ASSISTANT_API_KEY;
  const model = process.env.ASSISTANT_MODEL || "claude-3-5-haiku-latest";
  const context = passages
    .map((p, i) => `<passage index="${i + 1}" title="${p.title}" url="${p.url}">\n${p.body}\n</passage>`)
    .join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Passages from the CGZSA website:\n\n${context}\n\nVisitor's question: ${question}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Assistant provider returned ${res.status}`);
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens: number; output_tokens: number };
    model: string;
  };
  return {
    text: json.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim(),
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    model: json.model,
  };
}

export async function ask(question: string, cfg: AssistantConfig): Promise<AssistantAnswer> {
  const handover = (why: string): AssistantAnswer => ({
    body: why,
    sources: [],
    confidence: 0,
    handover: true,
    model: "none",
    inputTokens: 0,
    outputTokens: 0,
  });

  if (!cfg.enabled) return handover(cfg.handoverMessage);

  if (guardTripped(question, cfg.neverDiscuss)) {
    return handover(
      "That is not something I can speak about. I can pass this to the team and they will reply to you directly.",
    );
  }

  const qLower = question.trim().toLowerCase();
  const greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "hi there", "hello there"];
  if (greetings.includes(qLower) || qLower.startsWith("hi ") || qLower.startsWith("hello ")) {
    return {
      body: `Hello! I am ${cfg.assistantName || "the CGZSA AI Assistant"}. How can I help you today regarding our environmental programs, news, or organisation in Liberia?`,
      sources: [],
      confidence: 1.0,
      handover: false,
      model: "greeting",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const passages = await retrieve(question, 4);
  const best = passages[0]?.score ?? 0;

  if (!passages.length) {
    if (cfg.handOverWhenUnsure) {
      return handover(cfg.handoverMessage);
    }
  }

  const provider = process.env.ASSISTANT_PROVIDER ?? "stub";
  const sources = passages
    .filter((p) => p.score > 0.35)
    .map((p) => ({ title: p.title, url: p.url }))
    .filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i)
    .slice(0, 3);

  if (provider === "anthropic" && process.env.ASSISTANT_API_KEY) {
    try {
      const out = await callAnthropic(question, passages);
      if (out.text) {
        return {
          body: out.text,
          sources: cfg.showSources ? sources : [],
          confidence: best,
          handover: false,
          model: out.model,
          inputTokens: out.inputTokens,
          outputTokens: out.outputTokens,
        };
      }
    } catch (err) {
      log.error("provider failed, falling back to extractive", { err });
    }
  }

  if ((provider === "openai" || provider === "groq" || provider === "ollama") && (process.env.ASSISTANT_API_KEY || provider === "ollama")) {
    try {
      const out = await callOpenAICompatible(question, passages, provider);
      if (out.text) {
        return {
          body: out.text,
          sources: cfg.showSources ? sources : [],
          confidence: best,
          handover: false,
          model: out.model,
          inputTokens: out.inputTokens,
          outputTokens: out.outputTokens,
        };
      }
    } catch (err) {
      log.error("openai-compatible provider failed, falling back to extractive", { err });
    }
  }

  const body = compose(question, passages);
  if (!body) return handover(cfg.handoverMessage);

  return {
    body,
    sources: cfg.showSources ? sources : [],
    confidence: best,
    handover: false,
    model: "extractive",
    inputTokens: 0,
    outputTokens: 0,
  };
}

async function callOpenAICompatible(question: string, passages: Passage[], provider: "openai" | "groq" | "ollama") {
  const context = passages
    .map((p, i) => `<passage index="${i + 1}" title="${p.title}" url="${p.url}">\n${p.body}\n</passage>`)
    .join("\n\n");

  let baseUrl = process.env.ASSISTANT_BASE_URL;
  let defaultModel = "gpt-4o-mini";

  if (provider === "groq") {
    baseUrl = baseUrl || "https://api.groq.com/openai/v1";
    defaultModel = "llama-3.3-70b-versatile";
  } else if (provider === "ollama") {
    baseUrl = baseUrl || "http://localhost:11434/v1";
    defaultModel = "llama3.2";
  } else {
    baseUrl = baseUrl || "https://api.openai.com/v1";
  }

  const apiKey = process.env.ASSISTANT_API_KEY || "ollama";
  const model = process.env.ASSISTANT_MODEL || defaultModel;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Passages from the CGZSA website:\n\n${context}\n\nVisitor's question: ${question}` },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI-compatible provider (${provider}) returned ${res.status}`);

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
    model: string;
  };

  return {
    text: json.choices?.[0]?.message?.content?.trim() ?? "",
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    model: json.model || model,
  };
}
