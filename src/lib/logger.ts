import "server-only";

/**
 * A single, structured logging entry point — so production can plug in a
 * real log/error-monitoring platform (Sentry, Datadog, …) by changing the
 * `write()` implementation below, without touching any call site. Today
 * `write()` only goes to stdout/stderr (console) — see
 * docs/OBSERVABILITY.md for what that means in practice and what still
 * requires real deployment configuration.
 *
 * This is NOT retrofitted across every existing `console.error` call in the
 * codebase — that would be a large, risky mechanical refactor with no
 * functional benefit on its own. It's applied to the highest-value sites
 * added or touched in this pass (auth failures, readiness-check failures)
 * as the real, working pattern future call sites should follow.
 */

type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /password|token|cookie|secret|authorization|credential/i;

/** Recursively strips any field whose key name looks sensitive, so a
 * caller accidentally passing a whole request body/user object through
 * `context` can never leak a credential into logs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[REDACTED: too deep]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, event: string, context?: LogContext) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
