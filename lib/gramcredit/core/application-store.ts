import type {
  ApplicationReviewEvent,
  ApplicationStatus,
  ApplicationStatusRecord,
} from "./types";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface PersistedApplicationStore {
  records: Record<string, ApplicationStatusRecord>;
}

const storePath = resolveStorePath();

function resolveStorePath(): string {
  const configuredPath = process.env.GRAMCREDIT_APPLICATION_STORE_PATH?.trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.join(process.cwd(), ".data", "gramcredit-application-store.json");
}

function ensureStoreFile(): void {
  const storeDir = path.dirname(storePath);
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  if (!existsSync(storePath)) {
    const initialStore: PersistedApplicationStore = { records: {} };
    writeFileSync(storePath, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

function readStore(): PersistedApplicationStore {
  ensureStoreFile();

  const raw = readFileSync(storePath, "utf8");
  const parsed = JSON.parse(raw) as PersistedApplicationStore;

  if (!parsed || typeof parsed !== "object" || !parsed.records) {
    throw new Error("Application store file has invalid format.");
  }

  return parsed;
}

function writeStore(store: PersistedApplicationStore): void {
  ensureStoreFile();
  writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

export function upsertApplicationStatus(input: {
  applicationId: string;
  farmerId: string;
  status: ApplicationStatus;
  decision?: ApplicationStatusRecord["decision"];
  reason?: string;
}): ApplicationStatusRecord {
  const store = readStore();
  const now = Date.now();
  const existing = store.records[input.applicationId];

  const next: ApplicationStatusRecord = {
    applicationId: input.applicationId,
    farmerId: input.farmerId,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    decision: input.decision ?? existing?.decision,
    reason: input.reason ?? existing?.reason,
    reviewHistory: existing?.reviewHistory,
  };

  store.records[input.applicationId] = next;
  writeStore(store);
  return next;
}

export function getApplicationStatus(
  applicationId: string,
): ApplicationStatusRecord | null {
  const store = readStore();
  return store.records[applicationId] ?? null;
}

export function appendApplicationReviewEvent(input: {
  applicationId: string;
  reviewer: string;
  note: string;
  action: ApplicationReviewEvent["action"];
  status: ApplicationStatus;
  decision?: ApplicationStatusRecord["decision"];
}): ApplicationStatusRecord | null {
  const store = readStore();
  const existing = store.records[input.applicationId];
  if (!existing) {
    return null;
  }

  const event: ApplicationReviewEvent = {
    at: Date.now(),
    reviewer: input.reviewer,
    note: input.note,
    action: input.action,
  };

  const next: ApplicationStatusRecord = {
    ...existing,
    status: input.status,
    updatedAt: Date.now(),
    decision: input.decision ?? existing.decision,
    reviewHistory: [...(existing.reviewHistory ?? []), event],
  };

  store.records[input.applicationId] = next;
  writeStore(store);
  return next;
}
