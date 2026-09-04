import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The database client, connected on first use rather than on import.
 *
 * This module used to throw at import time when DATABASE_URL was unset. That
 * had two costs. Any module that touched the database — directly or three
 * imports away — could not be loaded without a live PostgreSQL, so pure logic
 * such as price arithmetic, path validation and permission predicates could not
 * be unit-tested at all, which is exactly the logic most worth testing. And a
 * missing variable surfaced as an opaque module-loading crash rather than as a
 * clear failure at the point of use.
 *
 * The check still happens, and still fails loudly with the same message — just
 * when a query is first attempted.
 */

const globalForDb = globalThis as unknown as {
  __sql?: ReturnType<typeof postgres>;
  __db?: ReturnType<typeof drizzle<typeof schema>>;
};

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");

  // A single pooled client per process. Next.js hot-reloads modules in
  // development, so the client is cached on globalThis to avoid exhausting
  // connections.
  const client =
    globalForDb.__sql ??
    postgres(url, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      idle_timeout: 20,
      // Fail a hung connection attempt rather than holding a request open until
      // the platform's own timeout kills it.
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") globalForDb.__sql = client;
  return drizzle(client, { schema });
}

function instance() {
  return (globalForDb.__db ??= connect());
}

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Behaves exactly like the Drizzle client. The proxy exists only to defer
 * connecting until the first property access.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(instance() as object, prop, receiver);
  },
  has(_target, prop) {
    return Reflect.has(instance() as object, prop);
  },
});

export { schema };
