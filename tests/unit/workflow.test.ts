import { describe, expect, it } from "vitest";
import { availableTransitions, canTransition } from "@/lib/workflow";
import type { Actor } from "@/lib/auth";

const actor = (...perms: string[]): Actor => ({
  id: "u1", name: "Test", email: "t@example.org", role: "EDITOR", roleLabel: "Editor",
  rank: 40, permissions: new Set(perms),
});

describe("editorial workflow", () => {
  it("lets an editor submit a draft for review", () => {
    expect(canTransition("DRAFT", "IN_REVIEW", actor("content.submit"))).toBe(true);
  });

  it("does not let an editor publish", () => {
    expect(canTransition("APPROVED", "PUBLISHED", actor("content.submit", "content.edit_others"))).toBe(false);
  });

  it("lets a reviewer publish an approved item", () => {
    expect(canTransition("APPROVED", "PUBLISHED", actor("content.publish"))).toBe(true);
  });

  it("refuses a transition that does not exist", () => {
    expect(canTransition("DRAFT", "ARCHIVED", actor("content.publish"))).toBe(false);
  });

  it("offers a contributor nothing but submission", () => {
    const t = availableTransitions("DRAFT", actor("content.create", "content.submit"));
    expect(t.map((x) => x.to)).toEqual(["IN_REVIEW"]);
  });

  it("offers a reviewer both approve and send back", () => {
    const t = availableTransitions("IN_REVIEW", actor("content.review"));
    expect(t.map((x) => x.to).sort()).toEqual(["APPROVED", "DRAFT"]);
  });
});
