import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import { persistApiAuditEvent } from "../../lib/gramcredit/core/audit-store";

async function run(): Promise<void> {
  const tmpDir = path.join(process.cwd(), ".tmp-tests");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const auditPath = path.join(
    tmpDir,
    `gramcredit-audit-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`,
  );

  process.env.GRAMCREDIT_AUDIT_ENABLED = "true";
  process.env.GRAMCREDIT_AUDIT_STORE_PATH = auditPath;

  const result = persistApiAuditEvent({
    eventType: "APPLY_VALIDATION_FAILED",
    route: "/api/gramcredit/apply",
    method: "POST",
    outcomeStatus: 400,
    applicationId: "APP_AUDIT_1",
    farmerId: "farmer_audit_1",
    actor: "farmer-portal",
    details: {
      mobileNumber: "9876543210",
      nested: {
        idNumber: "123456789012",
        idNumberMasked: "****9012",
        apiKey: "super-secret",
      },
      audioBlob: "base64-audio-content",
      consentToken: "token-value",
      safeField: "keep-this",
    },
  });

  assert.equal(result.ok, true);

  const lines = readFileSync(auditPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  assert.equal(lines.length, 1);

  const event = JSON.parse(lines[0]) as {
    at?: number;
    route: string;
    method: string;
    outcomeStatus: number;
    applicationId?: string;
    details?: Record<string, unknown>;
  };

  assert.ok(typeof event.at === "number");
  assert.equal(event.route, "/api/gramcredit/apply");
  assert.equal(event.method, "POST");
  assert.equal(event.outcomeStatus, 400);
  assert.equal(event.applicationId, "APP_AUDIT_1");

  const details = event.details as {
    mobileNumber: string;
    nested: { idNumber: string; idNumberMasked: string; apiKey: string };
    audioBlob: string;
    consentToken: string;
    safeField: string;
  };

  assert.equal(details.mobileNumber, "[REDACTED]");
  assert.equal(details.nested.idNumber, "[REDACTED]");
  assert.equal(details.nested.idNumberMasked, "****9012");
  assert.equal(details.nested.apiKey, "[REDACTED]");
  assert.equal(details.audioBlob, "[REDACTED]");
  assert.equal(details.consentToken, "[REDACTED]");
  assert.equal(details.safeField, "keep-this");

  process.env.GRAMCREDIT_AUDIT_ENABLED = "true";
  delete process.env.GRAMCREDIT_AUDIT_STORE_PATH;

  const misconfigured = persistApiAuditEvent({
    eventType: "STATUS_FETCHED",
    route: "/api/gramcredit/status/APP_AUDIT_1",
    method: "GET",
    outcomeStatus: 200,
  });

  assert.equal(misconfigured.ok, false);
  if (!misconfigured.ok) {
    assert.ok(misconfigured.error.includes("GRAMCREDIT_AUDIT_STORE_PATH"));
  }

  rmSync(auditPath, { force: true });
  console.log("Audit redaction tests passed.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
