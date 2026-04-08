import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

interface RouteContext {
  params: Promise<{ applicationId: string }>;
}

type ReviewAction = "MARK_UNDER_REVIEW" | "APPROVE" | "REJECT";

function createPostRequest(body: {
  reviewer: string;
  note: string;
  action: ReviewAction;
}, bearerToken?: string): any {
  const headers = new Headers();
  if (bearerToken) {
    headers.set("authorization", `Bearer ${bearerToken}`);
  }

  return {
    headers,
    json: async () => body,
  };
}

function createGetRequest(forwardedFor?: string): any {
  const headers = new Headers();
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }

  return { headers };
}

function createContext(applicationId: string): RouteContext {
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
    `gramcredit-store-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );

  process.env.GRAMCREDIT_APPLICATION_STORE_PATH = storePath;
  process.env.GRAMCREDIT_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.GRAMCREDIT_RATE_LIMIT_MAX_APPLY = "20";
  process.env.GRAMCREDIT_RATE_LIMIT_MAX_REVIEW = "20";

  const reviewRoute = await import(
    "../../app/api/gramcredit/review/[applicationId]/route"
  );
  const statusRoute = await import(
    "../../app/api/gramcredit/status/[applicationId]/route"
  );
  const appStore = await import("../../lib/gramcredit/core/application-store");

  const applicationId = "APP_REVIEW_API_TEST";
  appStore.upsertApplicationStatus({
    applicationId,
    farmerId: "farmer_review_test",
    status: "RECEIVED",
  });

  delete process.env.GRAMCREDIT_REVIEW_API_TOKEN;
  const missingTokenResponse = await reviewRoute.POST(
    createPostRequest({
      reviewer: "officer.1",
      note: "missing token config",
      action: "MARK_UNDER_REVIEW",
    }),
    createContext(applicationId),
  );
  assert.equal(missingTokenResponse.status, 503);

  process.env.GRAMCREDIT_REVIEW_API_TOKEN = "secure-review-token";
  const wrongTokenResponse = await reviewRoute.POST(
    createPostRequest(
      {
        reviewer: "officer.1",
        note: "wrong token",
        action: "MARK_UNDER_REVIEW",
      },
      "wrong-token",
    ),
    createContext(applicationId),
  );
  assert.equal(wrongTokenResponse.status, 401);

  const successResponse = await reviewRoute.POST(
    createPostRequest(
      {
        reviewer: "officer.1",
        note: "manual review started",
        action: "MARK_UNDER_REVIEW",
      },
      "secure-review-token",
    ),
    createContext(applicationId),
  );
  assert.equal(successResponse.status, 200);

  const successPayload = (await successResponse.json()) as {
    status: string;
    decision?: string;
    reviewHistory?: Array<{ action: string; reviewer: string; note: string }>;
  };
  assert.equal(successPayload.status, "REVIEW_IN_PROGRESS");
  assert.equal(successPayload.decision, "UNDER_REVIEW");
  assert.ok((successPayload.reviewHistory?.length || 0) >= 1);
  assert.equal(successPayload.reviewHistory?.[0]?.action, "MARK_UNDER_REVIEW");

  const statusResponse = await statusRoute.GET(
    createGetRequest("10.10.10.99"),
    createContext(applicationId),
  );
  assert.equal(statusResponse.status, 200);

  const statusPayload = (await statusResponse.json()) as {
    status: string;
    reviewHistory?: Array<{ action: string }>;
  };
  assert.equal(statusPayload.status, "REVIEW_IN_PROGRESS");
  assert.equal(statusPayload.reviewHistory?.[0]?.action, "MARK_UNDER_REVIEW");

  const persistedRaw = readFileSync(storePath, "utf8");
  const persisted = JSON.parse(persistedRaw) as {
    records?: Record<
      string,
      { status: string; reviewHistory?: Array<{ action: string }> }
    >;
  };

  assert.ok(persisted.records);
  assert.ok(persisted.records?.[applicationId]);
  assert.equal(persisted.records?.[applicationId]?.status, "REVIEW_IN_PROGRESS");
  assert.equal(
    persisted.records?.[applicationId]?.reviewHistory?.[0]?.action,
    "MARK_UNDER_REVIEW",
  );

  rmSync(storePath, { force: true });
  console.log("Review/status API tests passed.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
