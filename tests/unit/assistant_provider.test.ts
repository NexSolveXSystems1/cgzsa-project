import { describe, it, expect, vi } from "vitest";
import { ask, type AssistantConfig } from "@/lib/assistant";

vi.mock("@/lib/knowledge", () => ({
  retrieve: vi.fn().mockResolvedValue([
    {
      id: "p1",
      title: "CGZSA Mission",
      url: "/about",
      body: "Clean and Green Zero Sphere Alliance is dedicated to environmental sustainability in Liberia.",
      score: 0.9,
    },
  ]),
}));

const baseConfig: AssistantConfig = {
  enabled: true,
  restrictToContent: true,
  showSources: true,
  handOverWhenUnsure: false,
  confidenceThreshold: 0.1,
  maxRepliesPerConversation: 10,
  neverDiscuss: [],
  handoverMessage: "Connecting to support...",
  assistantName: "CGZSA AI",
};

describe("Assistant free & OpenAI-compatible provider integration", () => {
  it("uses extractive stub by default", async () => {
    delete process.env.ASSISTANT_PROVIDER;
    const res = await ask("Tell me about environmental sustainability in Liberia", baseConfig);
    expect(res.model).toBe("extractive");
    expect(res.handover).toBe(false);
  });

  it("calls OpenAI-compatible endpoint when configured", async () => {
    process.env.ASSISTANT_PROVIDER = "groq";
    process.env.ASSISTANT_API_KEY = "dummy-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "CGZSA works on sustainability in Liberia." } }],
        usage: { prompt_tokens: 50, completion_tokens: 15 },
        model: "llama-3.3-70b-versatile",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await ask("What is CGZSA?", baseConfig);
    expect(res.model).toBe("llama-3.3-70b-versatile");
    expect(res.body).toContain("sustainability");
    expect(res.handover).toBe(false);

    vi.unstubAllGlobals();
    delete process.env.ASSISTANT_PROVIDER;
    delete process.env.ASSISTANT_API_KEY;
  });
});
