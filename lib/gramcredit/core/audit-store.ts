import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface ApiAuditEvent {
  eventType: string;
  route: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  outcomeStatus: number;
  applicationId?: string;
  farmerId?: string;
  actor?: string;
  details?: Record<string, unknown>;
}

interface PersistedApiAuditEvent extends ApiAuditEvent {
  at: number;
}

const REDACTED = "[REDACTED]";
const sensitiveKeyPatterns = [
  "mobile",
  "phone",
  "aadhaar",
  "pan",
  "idnumber",
  "audio",
  "token",
  "apikey",
  "secret",
  "password",
  "authorization",
];

function isAuditEnabled(): boolean {
  const value = process.env.GRAMCREDIT_AUDIT_ENABLED;

  if (!value || value.trim() === "") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  throw new Error("GRAMCREDIT_AUDIT_ENABLED must be 'true' or 'false'.");
}

function getAuditStorePath(): string {
  const configuredPath = process.env.GRAMCREDIT_AUDIT_STORE_PATH?.trim();
  if (!configuredPath) {
    throw new Error(
      "GRAMCREDIT_AUDIT_STORE_PATH is required when GRAMCREDIT_AUDIT_ENABLED=true.",
    );
  }

  return path.resolve(configuredPath);
}

function ensureAuditDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.endsWith("masked")) {
    return false;
  }

  return sensitiveKeyPatterns.some((pattern) => normalizedKey.includes(pattern));
}

function redactValue(value: unknown, parentKey?: string): unknown {
  if (parentKey && isSensitiveKey(parentKey)) {
    return REDACTED;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, childValue] of Object.entries(input)) {
      output[key] = redactValue(childValue, key);
    }

    return output;
  }

  return value;
}

function toPersistedEvent(input: ApiAuditEvent): PersistedApiAuditEvent {
  return {
    ...input,
    at: Date.now(),
    details: input.details
      ? (redactValue(input.details) as Record<string, unknown>)
      : undefined,
  };
}

export function persistApiAuditEvent(
  input: ApiAuditEvent,
): { ok: true } | { ok: false; error: string } {
  try {
    if (!isAuditEnabled()) {
      return { ok: true };
    }

    const storePath = getAuditStorePath();
    ensureAuditDir(storePath);

    const event = toPersistedEvent(input);
    appendFileSync(storePath, `${JSON.stringify(event)}\n`, "utf8");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
