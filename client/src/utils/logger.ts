type LogLevel = "debug" | "info" | "warn" | "error";

const redactedKeys = new Set([
  "access_token",
  "refresh_token",
  "token",
  "authorization",
  "apikey",
  "anon_key",
  "password",
]);

const looksLikeJwt = (value: string) =>
  /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);

const sanitize = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (looksLikeJwt(value)) return "[redacted]";
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (redactedKeys.has(key.toLowerCase())) {
        result[key] = "[redacted]";
      } else if (typeof entry === "string" && looksLikeJwt(entry)) {
        result[key] = "[redacted]";
      } else {
        result[key] = sanitize(entry);
      }
    }
    return result;
  }
  return value;
};

const writeLog = (level: LogLevel, scope: string, message: string, meta?: unknown) => {
  const payload = meta === undefined ? undefined : sanitize(meta);
  const line = payload === undefined ? `[${scope}] ${message}` : `[${scope}] ${message}`;
  if (payload === undefined) {
    console[level](line);
  } else {
    console[level](line, payload);
  }
};

export const createLogger = (scope: string) => ({
  debug: (message: string, meta?: unknown) => writeLog("debug", scope, message, meta),
  info: (message: string, meta?: unknown) => writeLog("info", scope, message, meta),
  warn: (message: string, meta?: unknown) => writeLog("warn", scope, message, meta),
  error: (message: string, meta?: unknown) => writeLog("error", scope, message, meta),
});
