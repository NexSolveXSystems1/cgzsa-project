import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(here, "..");
const rootDir = path.join(backendDir, "..");
const frontendDirName = "cgzsa-frontend";
const mode = process.argv[2] === "start" ? "start" : "dev";

dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

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

async function checkDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check ../.env.");

  console.info(`[db] checking ${databaseTarget(url)}`);

  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    const [row] = await sql`
      select current_database() as database, current_user as user_name
    `;
    console.info(`[db] You are connected to the DB: ${row.database} as ${row.user_name}`);
  } finally {
    await sql.end();
  }
}

function startNext() {
  const nextBin = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
  const args = [nextBin, mode, frontendDirName];
  if (process.env.PORT) args.push("-p", process.env.PORT);

  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    env: { ...process.env, NODE_OPTIONS: "" },
    stdio: ["inherit", "pipe", "pipe"],
  });

  let announced = false;
  let failed = false;
  let readyTimer = null;

  function forward(chunk, stream) {
    const text = chunk.toString();
    stream.write(chunk);

    if (/Another next dev server is already running|error|failed/i.test(text)) {
      failed = true;
      if (readyTimer) clearTimeout(readyTimer);
    }

    if (!announced && !failed && /Ready in/i.test(text)) {
      readyTimer = setTimeout(() => {
        if (!announced && !failed && child.exitCode === null) {
          announced = true;
          console.info("[server] You have successfully started the CGZSA backend");
        }
      }, 1200);
    }
  }

  child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
  child.stderr.on("data", (chunk) => forward(chunk, process.stderr));

  const stop = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  child.on("exit", (code) => {
    if (readyTimer) clearTimeout(readyTimer);
    process.exit(code ?? 0);
  });
}

try {
  await checkDatabase();
  console.info(`[server] Starting CGZSA backend in ${mode} mode...`);
  startNext();
} catch (err) {
  console.error("[server] CGZSA backend could not start");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
