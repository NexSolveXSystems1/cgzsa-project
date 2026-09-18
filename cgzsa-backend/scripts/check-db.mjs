import dotenv from "dotenv";
import path from "node:path";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", "..", ".env"), quiet: true });

function databaseTarget(url) {
  try {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const user = decodeURIComponent(parsed.username);
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}/${database} as ${user}`;
  } catch {
    return "configured DATABASE_URL";
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check ../.env.");

  console.info(`[db] checking ${databaseTarget(url)}`);

  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    const [row] = await sql`
      select current_database() as database, current_user as user_name, now() as server_time
    `;
    console.info(`[db] connected to ${row.database} as ${row.user_name}`);
    console.info(`[db] server time ${row.server_time.toISOString()}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[db] connection failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
