/**
 * The editorial workflow, shared by every content type.
 *
 * Design review §19: Draft → In Review → Approved → Published → Archived.
 * Publishing is a distinct permission from editing, so an account compromised
 * at Editor level cannot push content live.
 */
import type { Actor } from "./auth";

export const STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const STATUS_CHIP: Record<Status, string> = {
  DRAFT: "chip-mute",
  IN_REVIEW: "chip-warn",
  APPROVED: "chip-info",
  PUBLISHED: "chip-ok",
  ARCHIVED: "chip-mute",
};

/** Which transitions exist at all, and what each one needs. */
const TRANSITIONS: { from: Status[]; to: Status; permission: string; label: string }[] = [
  { from: ["DRAFT"], to: "IN_REVIEW", permission: "content.submit", label: "Submit for review" },
  { from: ["IN_REVIEW"], to: "APPROVED", permission: "content.review", label: "Approve" },
  { from: ["IN_REVIEW"], to: "DRAFT", permission: "content.review", label: "Send back to draft" },
  { from: ["APPROVED", "DRAFT"], to: "PUBLISHED", permission: "content.publish", label: "Publish" },
  { from: ["PUBLISHED"], to: "ARCHIVED", permission: "content.publish", label: "Archive" },
  { from: ["ARCHIVED"], to: "DRAFT", permission: "content.publish", label: "Return to draft" },
];

export function availableTransitions(current: Status, actor: Actor) {
  return TRANSITIONS.filter(
    (t) => t.from.includes(current) && actor.permissions.has(t.permission),
  );
}

export function canTransition(current: Status, next: Status, actor: Actor) {
  return TRANSITIONS.some(
    (t) => t.from.includes(current) && t.to === next && actor.permissions.has(t.permission),
  );
}
