/**
 * Decision Engine
 * Makes loan approval/rejection decision based on GramScore and eligibility
 * No silent defaults - every decision has explicit reason codes
 */

import { GramCreditTraceLogger } from "../core/trace-logger";
import type {
  GramScoreOutput,
  DecisionOutput,
  ApplicationRequest,
} from "../core/types";
import { getGramCreditConfig } from "../core/config";
import { logModuleProcessing } from "../core/module-utils";

/**
 * Make approval decision based on GramScore
 */
export async function makeDecision(
  gramScore: GramScoreOutput,
  request: ApplicationRequest,
  logger: GramCreditTraceLogger
): Promise<DecisionOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    logger.logInput("decision_engine", {
      gramScore: gramScore.score,
      gramConfidence: gramScore.confidence,
      farmerId: request.farmerId,
      loanAmount: request.loanRequest.amount,
      farmerAge: request.farmerProfile.age,
    });

    const reasonCodes: string[] = [];
    let decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW" = "APPROVED";
    let approvedAmount = 0;
    let loanCategory: "MICRO" | "MINI" | "STANDARD" | "NONE" = "NONE";
    const eligibilityFailures: string[] = [];

    // ========== Check Minimum Confidence Threshold ==========
    if (gramScore.confidence < config.decision.minimumConfidence) {
      decision = "UNDER_REVIEW";
      reasonCodes.push("INSUFFICIENT_MODEL_CONFIDENCE");

      logger.logValidation(
        "decision_engine",
        false,
        `Confidence ${gramScore.confidence} below minimum ${config.decision.minimumConfidence}`
      );
    }

    // ========== Check Eligibility Filters ==========
    const eligibility = checkEligibility(request, config.decision.eligibilityFilters, logger);
    if (!eligibility.passed) {
      decision = "REJECTED";
      reasonCodes.push("FAILED_ELIGIBILITY_CHECK");
      eligibilityFailures.push(...eligibility.failures);

      logger.logValidation(
        "decision_engine",
        false,
        `Eligibility failures: ${eligibility.failures.join(", ")}`
      );
    }

    // ========== Check Component Signal Confidences ==========
    const signalConfidences = gramScore.details.signalConfidences;
    const minSignalConfidence = 0.5; // Any signal below this is risky

    const lowConfidenceSignals: string[] = [];
    if (signalConfidences.voice < minSignalConfidence) {
      lowConfidenceSignals.push("voice");
    }
    if (signalConfidences.socialGraph < minSignalConfidence) {
      lowConfidenceSignals.push("social");
    }
    if (signalConfidences.satellite < minSignalConfidence) {
      lowConfidenceSignals.push("satellite");
    }
    if (signalConfidences.behavior < minSignalConfidence) {
      lowConfidenceSignals.push("behavior");
    }

    if (signalConfidences.voice <= 0) {
      decision = "UNDER_REVIEW";
      reasonCodes.push("VOICE_SIGNAL_UNAVAILABLE");
      logger.logValidation(
        "decision_engine",
        false,
        "Voice signal unavailable for reliable underwriting",
      );
    }

    if (lowConfidenceSignals.length > 1) {
      decision = "UNDER_REVIEW";
      reasonCodes.push(`LOW_CONFIDENCE_SIGNALS_${lowConfidenceSignals.length}`);

      logger.logValidation(
        "decision_engine",
        false,
        `${lowConfidenceSignals.length} signals below confidence threshold: ${lowConfidenceSignals.join(", ")}`
      );
    }

    // ========== Assign Loan Category & Amount ==========
    if (decision !== "REJECTED") {
      const categoryResult = assignLoanCategory(
        gramScore.score,
        config.decision.approvalThresholds
      );

      loanCategory = categoryResult.category;
      if (categoryResult.category !== "NONE") {
        reasonCodes.push(categoryResult.reasonCode);

        if (decision === "UNDER_REVIEW") {
          approvedAmount = 0;
          reasonCodes.push("REQUIRES_MANUAL_REVIEW");
        } else {
          decision = "APPROVED";
          approvedAmount = categoryResult.amount;
        }

        logger.logProcessing("decision_engine", "loan_category_assigned", {
          category: loanCategory,
          amount: approvedAmount,
          gramScore: gramScore.score,
        });
      } else {
        decision = "REJECTED";
        reasonCodes.push("SCORE_BELOW_MINIMUM_THRESHOLD");
      }
    }

    // ========== Final Decision Logic ==========
    // Priority: REJECTED > UNDER_REVIEW > APPROVED
    if (eligibilityFailures.length > 0) {
      decision = "REJECTED";
    } else if (decision === "UNDER_REVIEW" && gramScore.score < config.decision.approvalThresholds.micro) {
      decision = "REJECTED";
      reasonCodes.push("UNDER_REVIEW_DOWNGRADE_TO_REJECTION");
    }

    logModuleProcessing(
      logger,
      "decision_engine",
      "final_decision",
      {
        decision,
        loanCategory,
        approvedAmount,
        reasonCodes,
        gramScore: gramScore.score,
      },
      Date.now() - startTime
    );

    return {
      decision,
      gramScore: gramScore.score,
      approvedAmount,
      loanCategory,
      reasonCodes,
      eligibilityFailures: eligibilityFailures.length > 0 ? eligibilityFailures : undefined,
    };
  } catch (error) {
    logger.logError("decision_engine", error);
    throw error;
  }
}

// ========== Eligibility Checking ==========

interface EligibilityResult {
  passed: boolean;
  failures: string[];
}

function checkEligibility(
  request: ApplicationRequest,
  filters: {
    minAge: number;
    maxAge: number;
    minPastLoans: number;
  },
  logger: GramCreditTraceLogger
): EligibilityResult {
  const failures: string[] = [];

  // Age check
  if (request.farmerProfile.age < filters.minAge) {
    failures.push(`AGE_BELOW_MINIMUM_${filters.minAge}`);
  }

  if (request.farmerProfile.age > filters.maxAge) {
    failures.push(`AGE_ABOVE_MAXIMUM_${filters.maxAge}`);
  }

  // Loan amount check (basic validation)
  if (request.loanRequest.amount <= 0) {
    failures.push("INVALID_LOAN_AMOUNT");
  }

  if (request.loanRequest.amount > 500000) {
    failures.push("LOAN_AMOUNT_EXCEEDS_PLATFORM_LIMIT");
  }

  // Location check
  if (!request.farmerProfile.location.latitude || !request.farmerProfile.location.longitude) {
    failures.push("INVALID_LOCATION");
  }

  // Farmer profile completeness
  if (!request.farmerProfile.cropType) {
    failures.push("MISSING_CROP_TYPE");
  }

  logger.logValidation(
    "decision_engine",
    failures.length === 0,
    `Eligibility check: ${failures.length} failures`,
    {
      age: request.farmerProfile.age,
      loanAmount: request.loanRequest.amount,
      failures,
    }
  );

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ========== Loan Category Assignment ==========

interface CategoryAssignment {
  category: "MICRO" | "MINI" | "STANDARD" | "NONE";
  amount: number;
  reasonCode: string;
}

function assignLoanCategory(
  gramScore: number,
  thresholds: {
    micro: number;
    mini: number;
    standard: number;
  }
): CategoryAssignment {
  if (gramScore >= thresholds.standard) {
    return {
      category: "STANDARD",
      amount: 100000, // ₹1L
      reasonCode: "APPROVED_STANDARD_LOAN",
    };
  } else if (gramScore >= thresholds.mini) {
    return {
      category: "MINI",
      amount: 25000, // ₹25k
      reasonCode: "APPROVED_MINI_LOAN",
    };
  } else if (gramScore >= thresholds.micro) {
    return {
      category: "MICRO",
      amount: 5000, // ₹5k
      reasonCode: "APPROVED_MICRO_LOAN",
    };
  } else {
    return {
      category: "NONE",
      amount: 0,
      reasonCode: "REJECTED_SCORE_BELOW_MINIMUM",
    };
  }
}

// ========== Decision Explanation Helpers ==========

/**
 * Get human-readable explanation for decision
 */
export function getDecisionExplanation(
  decision: DecisionOutput,
  gramScore: GramScoreOutput
): string {
  const mainReason = decision.reasonCodes[0];

  let explanation = "";
  switch (mainReason) {
    case "APPROVED_STANDARD_LOAN":
      explanation = `Congratulations! Your loan application has been approved for ₹${decision.approvedAmount}.`;
      break;
    case "APPROVED_MINI_LOAN":
      explanation = `Your loan application has been approved for ₹${decision.approvedAmount}. Consider this a stepping stone to larger loans.`;
      break;
    case "APPROVED_MICRO_LOAN":
      explanation = `Your loan application has been approved for ₹${decision.approvedAmount}. Build your credit history with us.`;
      break;
    case "REJECTED_SCORE_BELOW_MINIMUM":
      explanation =
        "Your application could not be approved at this time. Your score was below our minimum threshold.";
      break;
    case "FAILED_ELIGIBILITY_CHECK":
      explanation = `Your application does not meet our eligibility criteria: ${decision.eligibilityFailures?.join(", ") || "Unknown reason"}.`;
      break;
    case "INSUFFICIENT_MODEL_CONFIDENCE":
      explanation =
        "We could not assess your application with sufficient confidence. Please reapply with complete information.";
      break;
    default:
      explanation = `Your application status: ${decision.decision}`;
  }

  return explanation;
}
