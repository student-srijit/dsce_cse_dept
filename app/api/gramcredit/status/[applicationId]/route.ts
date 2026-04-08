import { NextRequest, NextResponse } from "next/server";
import { getApplicationStatus } from "@/lib/gramcredit/core/application-store";
import { resolveRequesterKey } from "@/lib/gramcredit/core/rate-limit";
import { persistApiAuditEvent } from "@/lib/gramcredit/core/audit-store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  const requesterKey = resolveRequesterKey(request);
  const statusRecord = getApplicationStatus(applicationId);

  if (!statusRecord) {
    const audit = persistApiAuditEvent({
      eventType: "STATUS_FETCH_NOT_FOUND",
      route: `/api/gramcredit/status/${applicationId}`,
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
      {
        error: "Application not found",
        applicationId,
      },
      { status: 404 },
    );
  }

  const audit = persistApiAuditEvent({
    eventType: "STATUS_FETCHED",
    route: `/api/gramcredit/status/${applicationId}`,
    method: "GET",
    outcomeStatus: 200,
    applicationId,
    farmerId: statusRecord.farmerId,
    details: {
      requesterKey,
      status: statusRecord.status,
      decision: statusRecord.decision,
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

  return NextResponse.json(statusRecord, { status: 200 });
}
