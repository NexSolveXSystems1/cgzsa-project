/**
 * Logging.
 *
 * The codebase had 21 bare `console.*` calls in server code, in a mixture of
 * shapes, with no level and no way to tell which subsystem a line came from.
 * That is fine while somebody is watching a terminal and useless the moment the
 * output goes to a log aggregator or a `docker logs` scrollback.
 *
 * This is deliberately about thirty lines rather than a logging library. The
 * application has one process, one output stream and no log routing to do, so a
 * dependency would buy structure this already provides and a supply chain to
 * keep patched.
 *
 * In production it emits one JSON object per line, which every aggregator can
 * parse. In development it emits something a person can read.
 *
 * Never log a password, a token, a session id or a full request body. The
 * `redact` helper below covers the fields that have turned up in practice; when
 * in doubt, log the shape rather than the value.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "").toLowerCase() as Level;
  if (configured in LEVELS) return LEVELS[configured];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

const SECRET_KEYS = /^(password|passwordHash|token|tokenHash|secret|totpSecret|authorization|cookie|apiKey|sessionId)$/i;

/** Replace anything that looks like a credential, at any depth. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

/** Errors do not survive JSON.stringify, so pull out the parts worth keeping. */
function describeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // The stack is useful in a log and must never reach a browser; the error
      // boundaries render their own text and never include this.
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      ...("code" in err ? { code: (err as { code?: unknown }).code } : {}),
    };
  }
  return { message: String(err) };
}

function emit(level: Level, scope: string, message: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < threshold()) return;

  const payload = {
    level,
    scope,
    message,
    at: new Date().toISOString(),
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };

  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(payload)
      : `[${scope}] ${message}${fields ? " " + JSON.stringify(redact(fields)) : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/**
 * A logger bound to one subsystem, so every line says where it came from:
 *
 *   const log = logger("contact");
 *   log.error("could not store message", { err });
 */
export function logger(scope: string) {
  return {
    debug: (message: string, fields?: Record<string, unknown>) => emit("debug", scope, message, fields),
    info: (message: string, fields?: Record<string, unknown>) => emit("info", scope, message, fields),
    warn: (message: string, fields?: Record<string, unknown>) => emit("warn", scope, message, fields),
    error: (message: string, fields?: Record<string, unknown> & { err?: unknown }) =>
      emit("error", scope, message, fields?.err !== undefined
        ? { ...fields, err: describeError(fields.err) }
        : fields),
  };
}

export type Logger = ReturnType<typeof logger>;
