/**
 * SHAP-Style Feature Attribution
 * Explains how each signal contributed to the final GramScore
 * Uses lightweight marginal value approach (not full coalitional)
 */

import { GramCreditTraceLogger } from "../core/trace-logger";
import type {
  VoiceModuleOutput,
  SocialGraphModuleOutput,
  SatelliteModuleOutput,
  BehaviorModuleOutput,
  GramScoreOutput,
  FeatureAttribution,
} from "../core/types";
import { getGramCreditConfig } from "../core/config";
import { logModuleProcessing } from "../core/module-utils";

/**
 * Generate SHAP-style attributions for all signals
 * Shows how much each signal contributed to pushing the final score up or down
 */
export async function generateSHAPAttributions(
  gramScore: GramScoreOutput,
  voiceScore: VoiceModuleOutput,
  socialScore: SocialGraphModuleOutput,
  satelliteScore: SatelliteModuleOutput,
  behaviorScore: BehaviorModuleOutput,
  logger: GramCreditTraceLogger
): Promise<FeatureAttribution[]> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    logger.logInput("shap_attributor", {
      gramScore: gramScore.score,
      signalScores: {
        voice: voiceScore.score,
        social: socialScore.score,
        satellite: satelliteScore.score,
        behavior: behaviorScore.score,
      },
    });

    // ========== Compute Baseline (Median Scores) ==========
    // In a real setting, these would be computed from historical data
    // For now, use default median of 50
    const baselineScores = {
      voice: 50,
      social: 50,
      satellite: 50,
      behavior: 50,
    };

    // ========== Compute Marginal Contributions ==========
    const attributions: FeatureAttribution[] = [];

    // Voice contribution
    attributions.push(
      computeContribution(
        "voice",
        voiceScore,
        baselineScores.voice,
        gramScore.details.weights.voice,
        gramScore.details.signalConfidences.voice,
        gramScore.score
      )
    );

    // Social contribution
    attributions.push(
      computeContribution(
        "social",
        socialScore,
        baselineScores.social,
        gramScore.details.weights.socialGraph,
        gramScore.details.signalConfidences.socialGraph,
        gramScore.score
      )
    );

    // Satellite contribution
    attributions.push(
      computeContribution(
        "satellite",
        satelliteScore,
        baselineScores.satellite,
        gramScore.details.weights.satellite,
        gramScore.details.signalConfidences.satellite,
        gramScore.score
      )
    );

    // Behavior contribution
    attributions.push(
      computeContribution(
        "behavior",
        behaviorScore,
        baselineScores.behavior,
        gramScore.details.weights.behavior,
        gramScore.details.signalConfidences.behavior,
        gramScore.score
      )
    );

    // ========== Normalize Contributions to Sum to 100 ==========
    const totalContribution = attributions.reduce(
      (sum, attr) => sum + attr.contribution,
      0
    );

    if (Math.abs(totalContribution) > 0) {
      for (const attr of attributions) {
        attr.percentageOfTotal =
          (attr.contribution / totalContribution) * 100;
      }
    } else {
      // All contributions are zero, distribute evenly
      for (const attr of attributions) {
        attr.percentageOfTotal = 25;
      }
    }

    logModuleProcessing(logger, "shap_attributor", "attributions_computed", {
      attributions: attributions.map((attr) => ({
        signal: attr.signalId,
        contribution: attr.contribution,
        percentage: attr.percentageOfTotal,
        confidence: attr.confidence,
      })),
    }, Date.now() - startTime);

    return attributions;
  } catch (error) {
    logger.logError("shap_attributor", error);
    throw error;
  }
}

// ========== Contribution Computation ==========

/**
 * Compute SHAP contribution for a single signal
 */
function computeContribution(
  signalId: "voice" | "social" | "satellite" | "behavior",
  signalOutput:
    | VoiceModuleOutput
    | SocialGraphModuleOutput
    | SatelliteModuleOutput
    | BehaviorModuleOutput,
  baselineScore: number,
  weight: number,
  confidence: number,
  finalScore: number
): FeatureAttribution {
  // Marginal contribution = weight × (actual - baseline)
  const scoreDelta = signalOutput.score - baselineScore;
  const marginalContribution = weight * scoreDelta;

  // Confidence-weighted contribution (high confidence increases impact)
  const confidenceAdjustedContribution = marginalContribution * confidence;

  // Direction
  const direction: "positive" | "negative" | "neutral" =
    Math.abs(marginalContribution) < 1
      ? "neutral"
      : marginalContribution > 0
        ? "positive"
        : "negative";

  return {
    signalId,
    signalName: getSignalName(signalId),
    contribution: confidenceAdjustedContribution,
    percentageOfTotal: 0, // Filled in by normalizeAttributions
    confidence,
    direction,
    reasonCode: signalOutput.reasonCode,
    baselineValue: baselineScore,
    actualValue: signalOutput.score,
  };
}

/**
 * Get human-readable signal name
 */
function getSignalName(signalId: string): string {
  const names: Record<string, string> = {
    voice: "Voice Interview",
    social: "Social Network",
    satellite: "Crop Health",
    behavior: "Mobile Behavior",
  };
  return names[signalId] || "Unknown Signal";
}

// ========== Attribution Visualization Helpers ==========

/**
 * Get color coding for attribution direction (for UI visualization)
 */
export function getAttributionColor(
  contribution: number
): "green" | "red" | "gray" {
  if (contribution > 5) return "green";
  if (contribution < -5) return "red";
  return "gray";
}

/**
 * Get icon for signal contribution
 */
export function getAttributionIcon(
  direction: "positive" | "negative" | "neutral"
): string {
  switch (direction) {
    case "positive":
      return "↑";
    case "negative":
      return "↓";
    default:
      return "→";
  }
}

/**
 * Create a human-readable attribution summary
 */
export function getAttributionSummary(
  attributions: FeatureAttribution[]
): string {
  const positive = attributions.filter((a) => a.direction === "positive");
  const negative = attributions.filter((a) => a.direction === "negative");

  let summary = "Your loan decision was based on:\n\n";

  if (positive.length > 0) {
    summary += "Strengths:\n";
    for (const attr of positive.sort(
      (a, b) => b.contribution - a.contribution
    )) {
      summary += `• ${attr.signalName}: +${attr.contribution.toFixed(1)} points\n`;
    }
  }

  if (negative.length > 0) {
    summary += "\nAreas to Improve:\n";
    for (const attr of negative.sort(
      (a, b) => a.contribution - b.contribution
    )) {
      summary += `• ${attr.signalName}: ${attr.contribution.toFixed(1)} points\n`;
    }
  }

  return summary;
}

/**
 * Rank signals by absolute contribution (for highlight/focus)
 */
export function rankAttributionsByImpact(
  attributions: FeatureAttribution[]
): FeatureAttribution[] {
  return [...attributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );
}

/**
 * Get the top N contributing signals
 */
export function getTopContributors(
  attributions: FeatureAttribution[],
  n: number = 3
): FeatureAttribution[] {
  return rankAttributionsByImpact(attributions).slice(0, n);
}
