/**
 * GramScore Fusion Engine
 * Combines all four signals into a single composite score
 * Fully configurable weights, normalization, and transformations
 */

import { GramCreditTraceLogger } from "../core/trace-logger";
import type {
  VoiceModuleOutput,
  SocialGraphModuleOutput,
  SatelliteModuleOutput,
  BehaviorModuleOutput,
  GramScoreOutput,
  GramScoreDetails,
} from "../core/types";
import { getGramCreditConfig } from "../core/config";
import {
  validateScore,
  validateConfidence,
  weightedAverage,
  logModuleProcessing,
} from "../core/module-utils";

/**
 * Fuse all four signals into GramScore
 */
export async function fuseSignalsIntoGramScore(
  voiceScore: VoiceModuleOutput,
  socialScore: SocialGraphModuleOutput,
  satelliteScore: SatelliteModuleOutput,
  behaviorScore: BehaviorModuleOutput,
  logger: GramCreditTraceLogger
): Promise<GramScoreOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    logger.logInput("gram_score_fusion", {
      signalScores: {
        voice: voiceScore.score,
        social: socialScore.score,
        satellite: satelliteScore.score,
        behavior: behaviorScore.score,
      },
      signalConfidences: {
        voice: voiceScore.confidence,
        social: socialScore.confidence,
        satellite: satelliteScore.confidence,
        behavior: behaviorScore.confidence,
      },
    });

    // ========== Normalize All Scores ==========
    // All signals are already 0-100, but we may apply transformations

    const normalizedVoice = applyNormalization(
      voiceScore.score,
      config.fusion.normalizationMethod
    );
    const normalizedSocial = applyNormalization(
      socialScore.score,
      config.fusion.normalizationMethod
    );
    const normalizedSatellite = applyNormalization(
      satelliteScore.score,
      config.fusion.normalizationMethod
    );
    const normalizedBehavior = applyNormalization(
      behaviorScore.score,
      config.fusion.normalizationMethod
    );

    logModuleProcessing(logger, "gram_score_fusion", "normalization_complete", {
      normalized: {
        voice: normalizedVoice,
        social: normalizedSocial,
        satellite: normalizedSatellite,
        behavior: normalizedBehavior,
      },
    });

    // ========== Apply Weights ==========
    const weights = [
      config.fusion.weights.voice,
      config.fusion.weights.socialGraph,
      config.fusion.weights.satellite,
      config.fusion.weights.behavior,
    ];

    const signalScores = [
      normalizedVoice,
      normalizedSocial,
      normalizedSatellite,
      normalizedBehavior,
    ];

    const gramScoreRaw = weightedAverage(signalScores, weights);

    logModuleProcessing(logger, "gram_score_fusion", "weighted_fusion", {
      weights: {
        voice: weights[0],
        social: weights[1],
        satellite: weights[2],
        behavior: weights[3],
      },
      gramScoreRaw,
    });

    // ========== Apply Non-linear Transform (if configured) ==========
    let gramScore = gramScoreRaw;

    if (config.fusion.nonlinearTransform) {
      gramScore = applyTransform(
        gramScoreRaw,
        config.fusion.nonlinearTransform.type,
        config.fusion.nonlinearTransform.steepness
      );

      logModuleProcessing(logger, "gram_score_fusion", "nonlinear_transform", {
        transform: config.fusion.nonlinearTransform.type,
        before: gramScoreRaw,
        after: gramScore,
      });
    }

    // ========== Compute Confidence ==========
    // Confidence is weighted average of signal confidences
    const confidences = [
      voiceScore.confidence,
      socialScore.confidence,
      satelliteScore.confidence,
      behaviorScore.confidence,
    ];

    const gramConfidence = weightedAverage(confidences, weights);

    logModuleProcessing(logger, "gram_score_fusion", "confidence_computation", {
      confidence: gramConfidence,
      signalConfidences: {
        voice: voiceScore.confidence,
        social: socialScore.confidence,
        satellite: satelliteScore.confidence,
        behavior: behaviorScore.confidence,
      },
    });

    // ========== Build Details Object ==========
    const gramScoreDetails: GramScoreDetails = {
      voiceScore: normalizedVoice,
      socialScore: normalizedSocial,
      satelliteScore: normalizedSatellite,
      behaviorScore: normalizedBehavior,
      weights: config.fusion.weights,
      signalConfidences: {
        voice: voiceScore.confidence,
        socialGraph: socialScore.confidence,
        satellite: satelliteScore.confidence,
        behavior: behaviorScore.confidence,
      },
    };

    logModuleProcessing(
      logger,
      "gram_score_fusion",
      "final_gram_score",
      {
        gramScore: validateScore(gramScore),
        confidence: validateConfidence(gramConfidence),
      },
      Date.now() - startTime
    );

    const response: GramScoreOutput = {
      score: validateScore(gramScore),
      confidence: validateConfidence(gramConfidence),
      reasonCode: "GRAM_SCORE_COMPUTED",
      details: gramScoreDetails,
      metadata: {
        moduleId: "gram_score_engine",
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  } catch (error) {
    logger.logError("gram_score_fusion", error);
    throw error;
  }
}

// ========== Normalization ==========

/**
 * Apply normalization method to score
 * Currently scores are 0-100, but this prepares for future changes
 */
function applyNormalization(score: number, method: "minmax" | "zscore"): number {
  // Scores are already normalized to 0-100
  // This function prepares for future advanced normalization
  return validateScore(score, 0, 100, 50);
}

// ========== Non-linear Transforms ==========

/**
 * Apply optional non-linear transform to GramScore
 * Useful for emphasizing differences or mapping to decision boundaries
 */
function applyTransform(
  score: number,
  type: "sigmoid" | "relu",
  steepness?: number
): number {
  switch (type) {
    case "sigmoid":
      return applySigmoid(score, steepness || 1);
    case "relu":
      return applyRelu(score);
    default:
      return score;
  }
}

/**
 * Sigmoid transform: smooth S-curve, amplifies mid-range decisions
 */
function applySigmoid(score: number, steepness: number): number {
  // Sigmoid on centered score
  const centered = (score - 50) / 10; // Convert to ~-5 to +5 range
  const sigmoid =
    1 / (1 + Math.exp(-centered * steepness)); // Apply sigmoid
  return sigmoid * 100; // Scale back to 0-100
}

/**
 * ReLU-like transform: boost high scores, suppress low scores
 */
function applyRelu(score: number): number {
  // Simple version: boost scores above 50, suppress below
  if (score < 40) {
    return Math.max(0, score * 0.7); // Compress low scores
  } else if (score < 60) {
    return score; // Keep mid-range unchanged
  } else {
    return Math.min(100, 50 + (score - 50) * 1.3); // Amplify high scores
  }
}

// ========== Debug Utilities ==========

/**
 * Create a detailed breakdown of GramScore composition
 * Useful for explainability
 */
export function getGramScoreBreakdown(gramScore: GramScoreOutput): {
  componentScores: Record<string, number>;
  contributions: Record<string, number>;
  contributionPercents: Record<string, number>;
} {
  const details = gramScore.details;
  const weights = details.weights;

  const componentScores = {
    voice: details.voiceScore,
    social: details.socialScore,
    satellite: details.satelliteScore,
    behavior: details.behaviorScore,
  };

  const contributions = {
    voice: details.voiceScore * weights.voice,
    social: details.socialScore * weights.socialGraph,
    satellite: details.satelliteScore * weights.satellite,
    behavior: details.behaviorScore * weights.behavior,
  };

  const totalContribution = Object.values(contributions).reduce(
    (a, b) => a + b,
    0
  );

  const contributionPercents = {
    voice:
      totalContribution > 0
        ? (contributions.voice / totalContribution) * 100
        : 0,
    social:
      totalContribution > 0
        ? (contributions.social / totalContribution) * 100
        : 0,
    satellite:
      totalContribution > 0
        ? (contributions.satellite / totalContribution) * 100
        : 0,
    behavior:
      totalContribution > 0
        ? (contributions.behavior / totalContribution) * 100
        : 0,
  };

  return {
    componentScores,
    contributions,
    contributionPercents,
  };
}
