import { NextRequest, NextResponse } from "next/server";
import { processLoanApplication } from "@/lib/gramcredit/orchestrator";
import { ApplicationRequest } from "@/lib/gramcredit/core/types";
import { createTraceLogger } from "@/lib/gramcredit/core/trace-logger";
import { generateApplicationId } from "@/lib/gramcredit/core/module-utils";

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

export async function POST(request: NextRequest) {
  const applicationId = generateApplicationId();
  const logger = createTraceLogger(applicationId, "unknown-farmer");

  try {
    logger.logInput("api-apply", {
      endpoint: "POST /api/gramcredit/apply",
      contentType: request.headers.get("content-type"),
    });

    const body = await request.json();
    const farmerId = asString(body?.farmerId);
    const farmerProfile = body?.farmerProfile;
    const loanRequestBody = body?.loanRequest;
    const location = farmerProfile?.location;

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

    if (validationErrors.length > 0) {
      logger.logError(
        "api-apply",
        `Validation errors: ${validationErrors.join("; ")}`,
      );
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
      metadata: {
        timestamp: Date.now(),
      },
    };

    logger.logProcessing("api-apply", "validation", {
      farmerId: appRequest.farmerId,
      requestedAmount: appRequest.loanRequest.amount,
    });

    // Process the application through the full GramCredit pipeline
    const result = await processLoanApplication(appRequest);

    logger.logOutput("api-apply", "application_processed", {
      decision: result.decision.decision,
      gramScore: result.gramScore.score,
      approvedAmount: result.decision.approvedAmount,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.logError(
      "api-apply",
      `Application processing failed: ${errorMessage}`,
    );

    return NextResponse.json(
      {
        error: "Application processing failed",
        details: errorMessage,
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
