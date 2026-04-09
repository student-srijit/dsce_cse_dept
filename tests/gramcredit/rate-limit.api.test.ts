import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

type ReviewAction = "MARK_UNDER_REVIEW" | "APPROVE" | "REJECT";

function createPostRequest(input: {
  reviewer: string;
  note: string;
  action: ReviewAction;
  bearerToken?: string;
  forwardedFor?: string;
}): any {
  const headers = new Headers();

  if (input.bearerToken) {
    headers.set("authorization", `Bearer ${input.bearerToken}`);
  }
  if (input.forwardedFor) {
    headers.set("x-forwarded-for", input.forwardedFor);
  }

  return {
    headers,
    json: async () => ({
      reviewer: input.reviewer,
      note: input.note,
      action: input.action,
    }),
  };
}

function createContext(applicationId: string) {
  return {
    params: Promise.resolve({ applicationId }),
  };
}

async function run(): Promise<void> {
  const tmpDir = path.join(process.cwd(), ".tmp-tests");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const storePath = path.join(
    tmpDir,
    `gramcredit-rate-limit-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );

  process.env.GRAMCREDIT_APPLICATION_STORE_PATH = storePath;
  process.env.GRAMCREDIT_REVIEW_API_TOKEN = "review-token-1";
  process.env.GRAMCREDIT_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.GRAMCREDIT_RATE_LIMIT_MAX_APPLY = "20";
  process.env.GRAMCREDIT_RATE_LIMIT_MAX_REVIEW = "1";

  const reviewRoute =
    await import("../../app/api/gramcredit/review/[applicationId]/route");
  const appStore = await import("../../lib/gramcredit/core/application-store");

  const applicationId = "APP_RATE_LIMIT_TEST";
  appStore.upsertApplicationStatus({
    applicationId,
    farmerId: "farmer_rate_limit",
    status: "RECEIVED",
  });

  const first = await reviewRoute.POST(
    createPostRequest({
      reviewer: "officer.1",
      note: "first attempt",
      action: "MARK_UNDER_REVIEW",
      bearerToken: "review-token-1",
      forwardedFor: "10.10.10.10",
    }),
    createContext(applicationId),
  );

  assert.equal(first.status, 200);

  const second = await reviewRoute.POST(
    createPostRequest({
      reviewer: "officer.1",
      note: "second attempt same window",
      action: "MARK_UNDER_REVIEW",
      bearerToken: "review-token-1",
      forwardedFor: "10.10.10.10",
    }),
    createContext(applicationId),
  );

  assert.equal(second.status, 429);
  const retryAfter = second.headers.get("Retry-After");
  assert.ok(retryAfter);

  const differentIp = await reviewRoute.POST(
    createPostRequest({
      reviewer: "officer.2",
      note: "different ip should have separate bucket",
      action: "MARK_UNDER_REVIEW",
      bearerToken: "review-token-1",
      forwardedFor: "10.10.10.11",
    }),
    createContext(applicationId),
  );

  assert.equal(differentIp.status, 200);

  delete process.env.GRAMCREDIT_RATE_LIMIT_WINDOW_MS;

  const misconfigured = await reviewRoute.POST(
    createPostRequest({
      reviewer: "officer.3",
      note: "missing limiter env",
      action: "MARK_UNDER_REVIEW",
      bearerToken: "review-token-1",
      forwardedFor: "10.10.10.12",
    }),
    createContext(applicationId),
  );

  assert.equal(misconfigured.status, 503);

  rmSync(storePath, { force: true });
  console.log("Rate-limit API tests passed.");
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
