import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  appendApplicationReviewEvent,
  getApplicationStatus,
} from "@/lib/gramcredit/core/application-store";
import { checkRateLimit, resolveRequesterKey } from "@/lib/gramcredit/core/rate-limit";
import { persistApiAuditEvent } from "@/lib/gramcredit/core/audit-store";

const actionMap = {
  MARK_UNDER_REVIEW: {
    status: "REVIEW_IN_PROGRESS" as const,
    decision: "UNDER_REVIEW" as const,
  },
  APPROVE: {
    status: "COMPLETED" as const,
    decision: "APPROVED" as const,
  },
  REJECT: {
    status: "COMPLETED" as const,
    decision: "REJECTED" as const,
  },
};

function parseBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function isTokenMatch(actualToken: string, expectedToken: string): boolean {
  const actualBuffer = Buffer.from(actualToken, "utf8");
  const expectedBuffer = Buffer.from(expectedToken, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  const record = getApplicationStatus(applicationId);
  const requesterKey = resolveRequesterKey(request);

  if (!record) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_RECORD_FETCH_NOT_FOUND",
      route: `/api/gramcredit/review/${applicationId}`,
      method: "GET",
      outcomeStatus: 404,
      applicationId,
      details: { requesterKey },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Application not found", applicationId },
      { status: 404 },
    );
  }

  const audit = persistApiAuditEvent({
    eventType: "REVIEW_RECORD_FETCHED",
    route: `/api/gramcredit/review/${applicationId}`,
    method: "GET",
    outcomeStatus: 200,
    applicationId,
    farmerId: record.farmerId,
    details: { requesterKey, status: record.status },
  });

  if (!audit.ok) {
    return NextResponse.json(
      {
        error: "Audit persistence failed",
        details: audit.error,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(record, { status: 200 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const requesterKey = resolveRequesterKey(request);
  const rateLimitResult = checkRateLimit("review", requesterKey);
  if (!rateLimitResult.allowed) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_RATE_LIMIT_BLOCK",
      route: "/api/gramcredit/review/[applicationId]",
      method: "POST",
      outcomeStatus: rateLimitResult.status,
      details: {
        requesterKey,
        reason: rateLimitResult.error,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: rateLimitResult.error,
      },
      {
        status: rateLimitResult.status,
        headers:
          rateLimitResult.status === 429 && rateLimitResult.retryAfterSeconds
            ? { "Retry-After": String(rateLimitResult.retryAfterSeconds) }
            : undefined,
      },
    );
  }

  const expectedReviewToken =
    process.env.GRAMCREDIT_REVIEW_API_TOKEN?.trim() || null;
  if (!expectedReviewToken) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_TOKEN_NOT_CONFIGURED",
      route: "/api/gramcredit/review/[applicationId]",
      method: "POST",
      outcomeStatus: 503,
      details: { requesterKey },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Review endpoint is not configured. Set GRAMCREDIT_REVIEW_API_TOKEN.",
      },
      { status: 503 },
    );
  }

  const requestToken = parseBearerToken(request);
  if (!requestToken || !isTokenMatch(requestToken, expectedReviewToken)) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_UNAUTHORIZED",
      route: "/api/gramcredit/review/[applicationId]",
      method: "POST",
      outcomeStatus: 401,
      details: { requesterKey },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "Unauthorized reviewer action.",
      },
      { status: 401 },
    );
  }

  const { applicationId } = await context.params;
  const body = await request.json();

  const reviewer =
    typeof body?.reviewer === "string" && body.reviewer.trim().length > 0
      ? body.reviewer.trim()
      : null;
  const note =
    typeof body?.note === "string" && body.note.trim().length > 0
      ? body.note.trim()
      : null;
  const action =
    typeof body?.action === "string" &&
    body.action in actionMap &&
    (body.action === "MARK_UNDER_REVIEW" ||
      body.action === "APPROVE" ||
      body.action === "REJECT")
      ? (body.action as "MARK_UNDER_REVIEW" | "APPROVE" | "REJECT")
      : null;

  if (!reviewer || !note || !action) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_INVALID_PAYLOAD",
      route: `/api/gramcredit/review/${applicationId}`,
      method: "POST",
      outcomeStatus: 400,
      applicationId,
      details: {
        requesterKey,
        payload: body,
      },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Invalid payload. reviewer, note, and action are required. action must be MARK_UNDER_REVIEW, APPROVE, or REJECT.",
      },
      { status: 400 },
    );
  }

  const updated = appendApplicationReviewEvent({
    applicationId,
    reviewer,
    note,
    action,
    status: actionMap[action].status,
    decision: actionMap[action].decision,
  });

  if (!updated) {
    const audit = persistApiAuditEvent({
      eventType: "REVIEW_APPLICATION_NOT_FOUND",
      route: `/api/gramcredit/review/${applicationId}`,
      method: "POST",
      outcomeStatus: 404,
      applicationId,
      actor: reviewer,
      details: {
        requesterKey,
        action,
      },
    });

    if (!audit.ok) {
      return NextResponse.json(
        {
          error: "Audit persistence failed",
          details: audit.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Application not found", applicationId },
      { status: 404 },
    );
  }

  const audit = persistApiAuditEvent({
    eventType: "REVIEW_ACTION_APPLIED",
    route: `/api/gramcredit/review/${applicationId}`,
    method: "POST",
    outcomeStatus: 200,
    applicationId,
    farmerId: updated.farmerId,
    actor: reviewer,
    details: {
      requesterKey,
      action,
      note,
      status: updated.status,
      decision: updated.decision,
    },
  });

  if (!audit.ok) {
    return NextResponse.json(
      {
        error: "Audit persistence failed",
        details: audit.error,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
