import type { Actor } from "./auth";

/**
 * Deliberately a type-only import. Pulling runtime values out of ./auth would
 * drag in the database client, which makes these pure predicates untestable
 * without a live PostgreSQL — and they are exactly the rules most worth testing.
 */

/**
 * Who may edit a given record.
 *
 * The permission `content.create` is labelled "Create and edit own drafts", but
 * no code distinguished own from others': every save action required
 * `content.edit_others` to edit anything at all. Two opposite failures followed.
 * A Contributor could create a draft and then never edit it, which made the role
 * unusable as designed. And because the edit screens were guarded on
 * `content.create`, which every role holds, any signed-in user could open the
 * editor for any record and read unpublished content — the save was refused, but
 * only after they had seen it.
 *
 * The rule this restores:
 *
 *   content.create        may create, and may edit a record they authored while
 *                         it is still a DRAFT
 *   content.edit_others   may edit any record in any state
 *
 * Once a record leaves DRAFT it has entered the review process, and changing it
 * out from under a reviewer is exactly what the workflow exists to prevent.
 */

export type OwnableRow = {
  authorId?: string | null;
  status?: string | null;
};

export function mayEdit(actor: Actor, row: OwnableRow): boolean {
  if (actor.permissions.has("content.edit_others")) return true;
  if (!actor.permissions.has("content.create")) return false;
  if (!row.authorId || row.authorId !== actor.id) return false;
  // A record with no workflow (team members) is editable by its author.
  return row.status == null || row.status === "DRAFT";
}

/**
 * Whether this person should be shown the record at all. Reading an unpublished
 * record is a lower bar than editing it — a Contributor can see the list — but
 * it is not open to everyone: they see their own drafts and anything published.
 */
export function mayView(actor: Actor, row: OwnableRow): boolean {
  if (actor.permissions.has("content.edit_others")) return true;
  if (row.status === "PUBLISHED" || row.status === "ARCHIVED") return true;
  return !!row.authorId && row.authorId === actor.id;
}
