/**
 * GramCredit Main Orchestrator
 * Coordinates all signal engines and generates final application decision
 */

import type {
  ApplicationRequest,
  ApplicationResponse,
  ScoredOutput,
  GramScoreOutput,
  DecisionOutput,
  DisbursementDetails,
  OceanTraits,
  TrustGraphMetrics,
  CropHealthMetrics,
  BehaviorMetrics,
  FeatureAttribution,
  VoiceModuleOutput,
  SocialGraphModuleOutput,
  SatelliteModuleOutput,
  BehaviorModuleOutput,
} from "./core/types";

import { createTraceLogger } from "./core/trace-logger";
import { generateApplicationId, generateTraceId } from "./core/module-utils";

// Import signal engines
import { scoreVoiceModule } from "./engines/voice-psychometric";
import { scoreSocialGraphModule } from "./engines/social-graph";
import { scoreSatelliteCropModule } from "./engines/satellite-crop";
import { scoreBehaviorSignalModule } from "./engines/behavior-signal";

// Import fusion & decision engines
import { fuseSignalsIntoGramScore } from "./fusion/gram-score-engine";
import { makeDecision } from "./fusion/decision-engine";
import { calculateDisbursement } from "./fusion/disbursement-engine";

// Import explainability
import { generateSHAPAttributions } from "./explainability/shap-attributor";
import { generateExplanation } from "./explainability/i18n-explainer";

/**
 * Main orchestration function
 * Validates request → parallel signal scoring → fusion → decision → disbursement → explanation
 */
export async function processLoanApplication(
  request: ApplicationRequest,
): Promise<ApplicationResponse> {
  const applicationId =
    request.metadata?.applicationId || generateApplicationId();
  const traceId = generateTraceId();

  const logger = createTraceLogger(applicationId, request.farmerId);

  try {
    // ========== Validation Phase ==========
    logger.logInput("orchestrator", {
      farmerId: request.farmerId,
      loanAmount: request.loanRequest.amount,
      location: request.farmerProfile.location,
      cropType: request.farmerProfile.cropType,
    });

    if (!request.audioBlob && !request.audioUrl) {
      throw new Error(
        "Either audioBlob or audioUrl must be provided for voice interview",
      );
    }

    if (request.loanRequest.amount <= 0) {
      throw new Error("Loan amount must be positive");
    }

    if (
      !request.farmerProfile.location.latitude ||
      !request.farmerProfile.location.longitude
    ) {
      throw new Error("Location coordinates required for satellite analysis");
    }

    // ========== Parallel Signal Scoring ==========
    logger.logProcessing("orchestrator", "parallel_scoring", {
      signals: ["voice", "social", "satellite", "behavior"],
    });

    const [voiceScore, socialScore, satelliteScore, behaviorScore] =
      await Promise.allSettled([
        scoreVoiceModule(
          request.audioBlob,
          request.audioUrl,
          request.farmerProfile.preferredLanguage,
          logger,
          false, // mockMode
        ),
        scoreSocialGraphModule(
          request.farmerId,
          logger,
          false, // mockMode
        ),
        scoreSatelliteCropModule(
          request.farmerProfile.location,
          request.farmerProfile.cropType,
          undefined, // plantedDate
          logger,
          false, // mockMode
        ),
        scoreBehaviorSignalModule(
          request.farmerId,
          logger,
          false, // mockMode
        ),
      ]).then((results) => {
        // Check for any failed signals
        const failures: string[] = [];
        results.forEach((result, idx) => {
          if (result.status === "rejected") {
            const signalNames = ["voice", "social", "satellite", "behavior"];
            const reason =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            failures.push(`${signalNames[idx]}: ${reason}`);
          }
        });

        if (failures.length > 0) {
          logger.logError(
            "orchestrator",
            `Signal scoring failures: ${failures.join(", ")}`,
          );
        }

        // Return results or re-throw
        return results.map((result) => {
          if (result.status === "rejected") {
            const reason =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            throw new Error(reason);
          }
          return result.value;
        });
      });

    // ========== Fusion Phase ==========
    logger.logProcessing("orchestrator", "fusion", {
      signalConfidences: {
        voice: voiceScore.confidence,
        social: socialScore.confidence,
        satellite: satelliteScore.confidence,
        behavior: behaviorScore.confidence,
      },
    });

    const gramScore = await fuseSignalsIntoGramScore(
      voiceScore,
      socialScore,
      satelliteScore,
      behaviorScore,
      logger,
    );

    // ========== Decision Phase ==========
    logger.logProcessing("orchestrator", "decision", {
      gramScore: gramScore.score,
    });

    const decision = await makeDecision(gramScore, request, logger);

    // ========== Disbursement Phase ==========
    let disbursement: DisbursementDetails | null = null;
    if (decision.decision === "APPROVED") {
      disbursement = await calculateDisbursement(decision, request, logger);
    }

    // ========== Explainability Phase ==========
    const attributions = await generateSHAPAttributions(
      gramScore,
      voiceScore,
      socialScore,
      satelliteScore,
      behaviorScore,
      logger,
    );

    const explanation: Record<string, string> = {};
    const languages: Array<"en" | "hi" | "ta" | "te" | "kn"> = [
      request.farmerProfile.preferredLanguage as any,
      "en", // Always include English as fallback
    ];

    for (const lang of Array.from(new Set(languages))) {
      explanation[lang] = await generateExplanation(
        decision,
        attributions,
        gramScore.score,
        decision.approvedAmount,
        disbursement?.tenureMonths || 0,
        disbursement?.monthlyPayment || 0,
        lang,
        logger,
      );
    }

    // ========== Finalize Response ==========
    const trace = logger.buildTrace({
      gramScore: gramScore.score,
      decision: decision.decision,
      attributions,
      explanation,
    });

    // Persist trace if configured
    await logger.persistTrace(trace);

    logger.logOutput("orchestrator", {
      decision: decision.decision,
      gramScore: gramScore.score,
      approvedAmount: decision.approvedAmount,
    });

    const response: ApplicationResponse = {
      applicationId,
      farmerId: request.farmerId,
      timestamp: Date.now(),
      decision,
      gramScore: {
        score: gramScore.score,
        confidence: gramScore.confidence,
        signals: {
          voice: gramScore.details.voiceScore,
          social: gramScore.details.socialScore,
          satellite: gramScore.details.satelliteScore,
          behavior: gramScore.details.behaviorScore,
        },
      },
      disbursement,
      attributions,
      explanation,
      traceId,
    };

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.logError("orchestrator", error, {
      phase: "processing",
    });

    const failurePayload = {
      applicationId,
      farmerId: request.farmerId,
      timestamp: Date.now(),
      error: errorMessage,
      traceId,
    };

    const wrappedError = new Error(errorMessage) as Error & {
      payload?: typeof failurePayload;
    };
    wrappedError.payload = failurePayload;
    throw wrappedError;
  }
}
