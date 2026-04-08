import { NextRequest, NextResponse } from "next/server";
import { processLoanApplication } from "@/lib/gramcredit/orchestrator";
import { ApplicationRequest } from "@/lib/gramcredit/core/types";
import { createTraceLogger } from "@/lib/gramcredit/core/trace-logger";
import { generateApplicationId } from "@/lib/gramcredit/core/module-utils";
import { upsertApplicationStatus } from "@/lib/gramcredit/core/application-store";
import { checkRateLimit, resolveRequesterKey } from "@/lib/gramcredit/core/rate-limit";
import { persistApiAuditEvent } from "@/lib/gramcredit/core/audit-store";

const SUPPORTED_LANGUAGES = new Set(["en", "hi", "ta", "te", "kn"]);

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const requesterKey = resolveRequesterKey(request);
  const rateLimitResult = checkRateLimit("apply", requesterKey);
  if (!rateLimitResult.allowed) {
    const audit = persistApiAuditEvent({
      eventType: "APPLY_RATE_LIMIT_BLOCK",
      route: "/api/gramcredit/apply",
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

  const applicationId = generateApplicationId();
  let currentFarmerId = "unknown-farmer";
  let logger: ReturnType<typeof createTraceLogger> | undefined;

  try {
    logger = createTraceLogger(applicationId, currentFarmerId);

    upsertApplicationStatus({
      applicationId,
      farmerId: currentFarmerId,
      status: "RECEIVED",
    });

    logger.logInput("api-apply", {
      endpoint: "POST /api/gramcredit/apply",
      contentType: request.headers.get("content-type"),
    });

    const body = await request.json();
    const farmerId = asString(body?.farmerId);
    if (farmerId) {
      currentFarmerId = farmerId;
    }
    const farmerProfile = body?.farmerProfile;
    const loanRequestBody = body?.loanRequest;
    const location = farmerProfile?.location;
    const consent = body?.consent;
    const kyc = body?.kyc;

    upsertApplicationStatus({
      applicationId,
      farmerId: currentFarmerId,
      status: "PROCESSING",
    });

    const preferredLanguageRaw = asString(farmerProfile?.preferredLanguage);
    const preferredLanguage =
      preferredLanguageRaw && SUPPORTED_LANGUAGES.has(preferredLanguageRaw)
        ? (preferredLanguageRaw as "en" | "hi" | "ta" | "te" | "kn")
        : null;

    const latitude = asNumber(location?.lat ?? location?.latitude);
    const longitude = asNumber(location?.lon ?? location?.longitude);
    const age = asNumber(farmerProfile?.age);
    const landSizeHectares = asNumber(farmerProfile?.landSizeHectares);

    const requestedLoanAmount = asNumber(
      body?.requestedLoanAmount ?? loanRequestBody?.amount,
    );

    const consentTermsAccepted = asBoolean(consent?.termsAccepted);
    const consentDataProcessingAccepted = asBoolean(
      consent?.dataProcessingAccepted,
    );
    const consentPolicyVersion = asString(consent?.policyVersion);
    const consentAcceptedAt = asNumber(consent?.acceptedAt);

    const kycIdType = asString(kyc?.idType);
    const kycIdNumber = asString(kyc?.idNumber);

    const validKycTypes = new Set([
      "aadhaar",
      "pan",
      "voter_id",
      "driving_license",
    ]);

    const validationErrors: string[] = [];

    if (!farmerId) validationErrors.push("farmerId is required");
    if (!body?.audioBlob && !body?.audioUrl) {
      validationErrors.push("Either audioBlob or audioUrl is required");
    }
    if (!asString(farmerProfile?.name))
      validationErrors.push("farmerProfile.name is required");
    if (age === null || age < 18 || age > 100) {
      validationErrors.push("farmerProfile.age must be between 18 and 100");
    }
    if (latitude === null || longitude === null) {
      validationErrors.push("farmerProfile.location lat/lon are required");
    }
    if (!asString(farmerProfile?.cropType)) {
      validationErrors.push("farmerProfile.cropType is required");
    }
    if (landSizeHectares === null || landSizeHectares <= 0) {
      validationErrors.push("farmerProfile.landSizeHectares must be > 0");
    }
    if (!preferredLanguage) {
      validationErrors.push(
        "farmerProfile.preferredLanguage must be one of en, hi, ta, te, kn",
      );
    }
    if (requestedLoanAmount === null || requestedLoanAmount <= 0) {
      validationErrors.push("requestedLoanAmount must be > 0");
    }
    if (consentTermsAccepted !== true) {
      validationErrors.push("consent.termsAccepted must be true");
    }
    if (consentDataProcessingAccepted !== true) {
      validationErrors.push("consent.dataProcessingAccepted must be true");
    }
    if (!consentPolicyVersion) {
      validationErrors.push("consent.policyVersion is required");
    }
    if (consentAcceptedAt === null || consentAcceptedAt <= 0) {
      validationErrors.push("consent.acceptedAt must be a valid timestamp");
    }
    if (!kycIdType || !validKycTypes.has(kycIdType)) {
      validationErrors.push(
        "kyc.idType must be one of aadhaar, pan, voter_id, driving_license",
      );
    }
    if (!kycIdNumber || kycIdNumber.length < 4) {
      validationErrors.push("kyc.idNumber must be at least 4 characters");
    }

    if (validationErrors.length > 0) {
      logger.logError(
        "api-apply",
        `Validation errors: ${validationErrors.join("; ")}`,
      );

      const audit = persistApiAuditEvent({
        eventType: "APPLY_VALIDATION_FAILED",
        route: "/api/gramcredit/apply",
        method: "POST",
        outcomeStatus: 400,
        applicationId,
        farmerId: currentFarmerId,
        details: {
          requesterKey,
          validationErrors,
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

      upsertApplicationStatus({
        applicationId,
        farmerId: currentFarmerId,
        status: "FAILED",
        reason: validationErrors.join("; "),
      });

      return NextResponse.json(
        { error: "Invalid request payload", details: validationErrors },
        { status: 400 },
      );
    }

    const cropCycleRaw = asString(loanRequestBody?.cropCycle);
    const cropCycle =
      cropCycleRaw && ["kharif", "rabi", "zaid"].includes(cropCycleRaw)
        ? (cropCycleRaw as "kharif" | "rabi" | "zaid")
        : undefined;

    const tenureMonths = asNumber(loanRequestBody?.tenureMonths);

    // Build ApplicationRequest
    const appRequest: ApplicationRequest = {
      farmerId: farmerId!,
      audioBlob: body.audioBlob || undefined,
      audioUrl: body.audioUrl || undefined,
      farmerProfile: {
        farmerId: farmerId!,
        name: asString(farmerProfile?.name)!,
        age: age!,
        location: {
          latitude: latitude!,
          longitude: longitude!,
          village: asString(farmerProfile?.village) || undefined,
          state: asString(farmerProfile?.state) || undefined,
        },
        cropType: asString(farmerProfile?.cropType)!,
        landSizeAcres: landSizeHectares! * 2.47105,
        mobileNumber: asString(farmerProfile?.mobileNumber) || undefined,
        yearsFarming:
          asNumber(farmerProfile?.yearsFarming) !== null
            ? asNumber(farmerProfile?.yearsFarming)!
            : undefined,
        annualIncome:
          asNumber(farmerProfile?.annualIncome) !== null
            ? asNumber(farmerProfile?.annualIncome)!
            : undefined,
        hasIrrigation: asBoolean(farmerProfile?.hasIrrigation) ?? undefined,
        hasStorage: asBoolean(farmerProfile?.hasStorage) ?? undefined,
        pastLoanCount:
          asNumber(farmerProfile?.pastLoanCount) !== null
            ? Math.max(0, Math.round(asNumber(farmerProfile?.pastLoanCount)!))
            : undefined,
        landOwnershipType:
          asString(farmerProfile?.landOwnershipType) === "owned" ||
          asString(farmerProfile?.landOwnershipType) === "leased" ||
          asString(farmerProfile?.landOwnershipType) === "shared"
            ? (asString(farmerProfile?.landOwnershipType) as
                | "owned"
                | "leased"
                | "shared")
            : undefined,
        preferredLanguage: preferredLanguage!,
      },
      loanRequest: {
        amount: requestedLoanAmount!,
        tenureMonths:
          tenureMonths !== null && tenureMonths > 0
            ? Math.round(tenureMonths)
            : undefined,
        purpose:
          asString(body?.loanPurpose) ||
          asString(loanRequestBody?.purpose) ||
          undefined,
        cropCycle,
      },
      consent: {
        termsAccepted: true,
        dataProcessingAccepted: true,
        policyVersion: consentPolicyVersion!,
        acceptedAt: consentAcceptedAt!,
      },
      kyc: {
        idType: kycIdType as "aadhaar" | "pan" | "voter_id" | "driving_license",
        idNumberMasked: `****${kycIdNumber!.slice(-4)}`,
        verified: false,
      },
      metadata: {
        timestamp: Date.now(),
        applicationId,
      },
    };

    logger.logProcessing("api-apply", "validation", {
      farmerId: appRequest.farmerId,
      requestedAmount: appRequest.loanRequest.amount,
    });

    // Process the application through the full GramCredit pipeline
    const result = await processLoanApplication(appRequest);

    logger.logOutput("api-apply", {
      event: "application_processed",
      decision: result.decision.decision,
      gramScore: result.gramScore.score,
      approvedAmount: result.decision.approvedAmount,
    });

    upsertApplicationStatus({
      applicationId: result.applicationId,
      farmerId: result.farmerId,
      status:
        result.decision.decision === "UNDER_REVIEW"
          ? "UNDER_REVIEW"
          : "COMPLETED",
      decision: result.decision.decision,
    });

    const audit = persistApiAuditEvent({
      eventType: "APPLY_COMPLETED",
      route: "/api/gramcredit/apply",
      method: "POST",
      outcomeStatus: 200,
      applicationId: result.applicationId,
      farmerId: result.farmerId,
      details: {
        requesterKey,
        decision: result.decision.decision,
        gramScore: result.gramScore.score,
        approvedAmount: result.decision.approvedAmount,
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

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const payload =
      error && typeof error === "object" && "payload" in error
        ? (error as { payload?: unknown }).payload
        : undefined;
    logger?.logError(
      "api-apply",
      `Application processing failed: ${errorMessage}`,
    );

    upsertApplicationStatus({
      applicationId,
      farmerId: currentFarmerId,
      status: "FAILED",
      reason: errorMessage,
    });

    const audit = persistApiAuditEvent({
      eventType: "APPLY_PROCESSING_FAILED",
      route: "/api/gramcredit/apply",
      method: "POST",
      outcomeStatus: 500,
      applicationId,
      farmerId: currentFarmerId,
      details: {
        requesterKey,
        error: errorMessage,
        payload,
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
        error: "Application processing failed",
        details: errorMessage,
        payload,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}
