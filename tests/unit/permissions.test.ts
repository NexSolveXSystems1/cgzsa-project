import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Every permission the seed defines must be checked somewhere in the code.
 *
 * The audit found two that were not: `chat.transcripts` and `security.manage`.
 * Both were seeded, granted to specific roles, and rendered in the permission
 * matrix on the users screen — while being checked by no `if` statement
 * anywhere. An administrator reading that screen would reasonably conclude that
 * Editors could not read chat transcripts. They could.
 *
 * A permission that grants nothing is worse than a missing one, because it
 * misleads exactly the person responsible for the system's security. This test
 * makes that failure loud: add a permission to the seed without enforcing it
 * and the suite goes red.
 *
 * It reads the source as text rather than importing it, because the modules that
 * do the enforcing pull in the database client and Next.js request context.
 */

const ROOT = path.join(import.meta.dirname, "..", "..");
const FRONTEND_SRC = path.join(ROOT, "cgzsa-frontend", "src");
const BACKEND_SRC = path.join(ROOT, "cgzsa-backend", "src");
const SEED = path.join(BACKEND_SRC, "db", "seed.ts");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** The permission keys the seed declares, read straight out of its PERMISSIONS array. */
function declaredPermissions(): string[] {
  const seed = readFileSync(SEED, "utf8");
  const block = /const PERMISSIONS: \[string, string, string\]\[\] = \[([\s\S]*?)\n\];/.exec(seed);
  if (!block) throw new Error("Could not find the PERMISSIONS array in seed.ts");
  return [...block[1].matchAll(/\["([a-z_.]+)",/g)].map((m) => m[1]);
}

describe("the permission matrix is honest", () => {
  const permissions = declaredPermissions();

  // Everything except the seed itself, which only declares them.
  const files = [FRONTEND_SRC, BACKEND_SRC].flatMap((dir) => sourceFiles(dir)).filter((f) => f !== SEED);
  const corpus = files.map((f) => readFileSync(f, "utf8")).join("\n");

  it("declares the permissions the README describes", () => {
    expect(permissions.length).toBe(18);
  });

  it.each(permissions)("%s is enforced somewhere outside the seed", (key) => {
    // A bare mention is not enough on its own, but every enforcement site in
    // this codebase spells the key as a string literal, so its presence outside
    // the seed is a reliable signal that something consults it.
    expect(corpus, `"${key}" is granted to roles but never checked in any screen or action`)
      .toContain(`"${key}"`);
  });

  it("has no permission that only the users screen renders", () => {
    // The matrix on the users screen lists every permission by definition, so a
    // key that appears ONLY there is one nothing enforces — which is exactly the
    // shape of the two defects the audit found.
    const usersScreen = path.join(FRONTEND_SRC, "app", "admin", "users", "page.tsx");
    const elsewhere = files
      .filter((f) => f !== usersScreen)
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    const decorative = permissions.filter((k) => !elsewhere.includes(`"${k}"`));
    expect(decorative, "these are displayed in the matrix but enforced nowhere").toEqual([]);
  });
});
