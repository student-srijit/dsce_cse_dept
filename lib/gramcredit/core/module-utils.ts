/**
 * GramCredit Module Utilities
 * Common functions used across signal engines
 */

import type { ScoredOutput } from "./types";
import { GramCreditTraceLogger } from "./trace-logger";

// ========== Score Normalization ==========

/**
 * Normalize score to 0-100 range using min-max scaling
 */
export function normalizeMinMax(
  value: number,
  min: number,
  max: number
): number {
  if (max <= min) {
    return 50; // Default to neutral if range is invalid
  }

  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Normalize score using z-score (standardization)
 * Returns normalized value centered around 50
 */
export function normalizeZScore(
  value: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) {
    return 50; // Default if no variation
  }

  const zScore = (value - mean) / stdDev;
  const normalized = 50 + zScore * 15; // ±3 sigma → 5-95 range
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Apply sigmoid transformation to score
 * Useful for confidence-weighted scoring
 */
export function sigmoidTransform(
  value: number,
  steepness: number = 1
): number {
  const x = (value - 50) / 10 * steepness; // Shift to 0-center
  const sigmoid = 1 / (1 + Math.exp(-x));
  return sigmoid * 100;
}

// ========== Confidence Scoring ==========

/**
 * Compute confidence score from sample variance or uncertainty
 * Higher variance/error → lower confidence
 */
export function confidenceFromVariance(
  variance: number,
  maxVariance: number = 1
): number {
  const confidence = Math.max(0, 1 - variance / maxVariance);
  return Math.min(1, confidence);
}

/**
 * Compute confidence based on data quality/completeness
 */
export function confidenceFromDataQuality(
  dataPoints: number,
  minRequired: number
): number {
  if (dataPoints < minRequired) {
    return Math.max(0.1, dataPoints / minRequired * 0.8); // Never zero, but penalized
  }
  return Math.min(1, 0.8 + (dataPoints / (minRequired * 2)) * 0.2); // Saturates at 1
}

// ========== Anomaly Detection ==========

/**
 * Detect outliers using z-score method
 * Returns true if value is > threshold standard deviations from mean
 */
export function isOutlier(
  value: number,
  mean: number,
  stdDev: number,
  threshold: number = 3
): boolean {
  if (stdDev === 0) return false;
  const zScore = Math.abs((value - mean) / stdDev);
  return zScore > threshold;
}

/**
 * Compute isolation forest-like anomaly score (simplified)
 * Returns 0-1 score, higher = more anomalous
 */
export function simpleAnomalyScore(
  values: number[],
  target: number,
  sensitivity: number = 2.5
): number {
  if (values.length === 0) return 0.5; // No data = uncertain

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0; // No variance = target is normal

  const zScore = Math.abs((target - mean) / stdDev);
  const anomalyScore = Math.min(1, zScore / sensitivity); // Normalize by sensitivity
  return anomalyScore;
}

// ========== Weighted Aggregation ==========

/**
 * Weighted average of multiple scores
 * Validates weights sum to 1
 */
export function weightedAverage(
  values: number[],
  weights: number[]
): number {
  if (values.length !== weights.length) {
    throw new Error("Values and weights must have same length");
  }

  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    console.warn(
      `Weights sum to ${weightSum}, not 1.0. Normalizing automatically.`
    );
  }

  const weighted = values.reduce((sum, v, i) => sum + v * (weights[i] / weightSum), 0);
  return weighted;
}

/**
 * Confidence-weighted average
 * Scores with higher confidence influence the average more
 */
export function confidenceWeightedAverage(
  values: number[],
  confidences: number[]
): number {
  if (values.length !== confidences.length) {
    throw new Error("Values and confidences must have same length");
  }

  const confidenceSum = confidences.reduce((a, b) => a + b, 0);
  if (confidenceSum === 0) return 50; // All zero confidence = neutral

  const weighted = values.reduce(
    (sum, v, i) => sum + v * (confidences[i] / confidenceSum),
    0
  );
  return weighted;
}

// ========== Time Utilities ==========

/**
 * Get number of days between two dates
 */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Get days since date
 */
export function daysSince(date: Date): number {
  return daysBetween(date, new Date());
}

/**
 * Check if date is within window (in days)
 */
export function isWithinDays(date: Date, days: number): boolean {
  return daysSince(date) <= days;
}

// ========== Data Validation ==========

/**
 * Validate score is in valid range and return default if not
 */
export function validateScore(
  score: number,
  min: number = 0,
  max: number = 100,
  defaultValue: number = 50
): number {
  if (typeof score !== "number" || isNaN(score)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, score));
}

/**
 * Validate confidence is 0-1
 */
export function validateConfidence(
  confidence: number,
  defaultValue: number = 0.5
): number {
  if (typeof confidence !== "number" || isNaN(confidence)) {
    return defaultValue;
  }
  return Math.max(0, Math.min(1, confidence));
}

// ========== Error Handling ==========

/**
 * Create a failed ScoredOutput with error reason
 */
export function createErrorOutput<T = Record<string, any>>(
  moduleId: string,
  error: Error | string,
  reasonCode: string,
  fallbackScore: number = 0,
  details?: T
): ScoredOutput<T> {
  const errorMessage = typeof error === "string" ? error : error.message;

  return {
    score: fallbackScore,
    confidence: 0.0, // Zero confidence in error case
    reasonCode,
    details: details || ({} as T),
    metadata: {
      moduleId,
      timestamp: Date.now(),
      processingTimeMs: 0,
    },
  };
}

// ========== Logging Helpers ==========

/**
 * Create a standardized error log entry
 */
export function logModuleError(
  logger: GramCreditTraceLogger,
  moduleId: string,
  error: Error | string,
  context?: Record<string, any>
): void {
  logger.logError(moduleId, error, {
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log module processing with timing
 */
export function logModuleProcessing(
  logger: GramCreditTraceLogger,
  moduleId: string,
  step: string,
  data: Record<string, any>,
  durationMs?: number
): void {
  logger.logProcessing(moduleId, step, {
    ...data,
    durationMs,
  });
}

// ========== ID Generation ==========

/**
 * Generate a unique application ID
 */
export function generateApplicationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APP_${timestamp}_${random}`;
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRACE_${timestamp}_${random}`;
}
