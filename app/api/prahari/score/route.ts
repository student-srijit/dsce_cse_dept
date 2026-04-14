import { NextRequest, NextResponse } from "next/server";
import { runPrahariRiskPipeline } from "@/lib/prahari";
import type {
  BehaviorSession,
  BeneficiaryRecord,
  FaceLivenessSignals,
  FederatedClientMetrics,
  KycDocumentSignals,
  PrahariPipelineInput,
  UpiTransactionEvent,
  UpiUserFeature,
} from "@/lib/prahari";

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

function toRiskDecision(score: number): "ALLOW" | "STEP_UP" | "BLOCK" {
  if (score >= 70) return "BLOCK";
  if (score >= 45) return "STEP_UP";
  return "ALLOW";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PrahariPipelineInput>;

    const transactionSequence = (body.transactionSequence || []) as UpiTransactionEvent[];
    const userFeatures = (body.userFeatures || []) as UpiUserFeature[];
    const beneficiaryRecords = (body.beneficiaryRecords || []) as BeneficiaryRecord[];
    const kycSignals = body.kycSignals as KycDocumentSignals | undefined;
    const faceSignals = body.faceSignals as FaceLivenessSignals | undefined;
    const baselineBehavior = (body.baselineBehavior || []) as BehaviorSession[];
    const currentBehavior = body.currentBehavior as BehaviorSession | undefined;
    const federatedClients =
      (body.federatedClients || []) as FederatedClientMetrics[];

    const validationErrors: string[] = [];

    if (!Array.isArray(transactionSequence) || transactionSequence.length < 1) {
      validationErrors.push("transactionSequence must contain at least 1 transaction");
    }
    if (!Array.isArray(userFeatures) || userFeatures.length < 1) {
      validationErrors.push("userFeatures must contain at least 1 user feature record");
    }
    if (!Array.isArray(beneficiaryRecords) || beneficiaryRecords.length < 1) {
      validationErrors.push("beneficiaryRecords must contain at least 1 record");
    }
    if (!kycSignals) {
      validationErrors.push("kycSignals is required");
    }
    if (!faceSignals) {
      validationErrors.push("faceSignals is required");
    }
    if (!Array.isArray(baselineBehavior) || baselineBehavior.length < 5) {
      validationErrors.push("baselineBehavior must contain at least 5 sessions");
    }
    if (!currentBehavior) {
      validationErrors.push("currentBehavior is required");
    }
    if (!Array.isArray(federatedClients) || federatedClients.length < 1) {
      validationErrors.push("federatedClients must contain at least 1 client record");
    }

    const firstTxn = transactionSequence[0];
    if (!firstTxn || !asString(firstTxn.id) || asNumber(firstTxn.amount) === null) {
      validationErrors.push("transactionSequence records are malformed");
    }

    if (
      kycSignals &&
      [
        kycSignals.fontConsistency,
        kycSignals.pixelNoiseIntegrity,
        kycSignals.qrMatchScore,
        kycSignals.microPrintIntegrity,
        kycSignals.laminateReflectionScore,
        kycSignals.nameMatchScore,
      ].some((value) => asNumber(value) === null)
    ) {
      validationErrors.push("kycSignals fields must be numeric");
    }

    if (
      faceSignals &&
      [
        faceSignals.blinkConsistency,
        faceSignals.textureAuthenticity,
        faceSignals.frequencyArtifactRisk,
      ].some((value) => asNumber(value) === null)
    ) {
      validationErrors.push("faceSignals fields must be numeric");
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid PRAHARI payload",
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    const input: PrahariPipelineInput = {
      transactionSequence,
      userFeatures,
      beneficiaryRecords,
      kycSignals: kycSignals!,
      faceSignals: faceSignals!,
      baselineBehavior,
      currentBehavior: currentBehavior!,
      federatedClients,
    };

    const result = runPrahariRiskPipeline(input);
    const fusedRiskScore = result.fused.riskScore;

    return NextResponse.json({
      ok: true,
      timestamp: Date.now(),
      riskDecision: toRiskDecision(fusedRiskScore),
      fusedRiskScore,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "PRAHARI scoring failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
