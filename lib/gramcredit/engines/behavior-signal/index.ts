/**
 * Behavior Signal Engine
 * Scores mobile discipline from UPI transaction patterns and recharge regularity
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type { BehaviorModuleOutput, BehaviorMetrics } from "../../core/types";
import { getGramCreditConfig } from "../../core/config";
import {
  validateScore,
  createErrorOutput,
  logModuleProcessing,
} from "../../core/module-utils";

export interface BehaviorSignalData {
  upiTransactions: Array<{
    date: Date;
    amount: number;
    type: "credit" | "debit";
  }>;
  recharges: Array<{
    date: Date;
    amount: number;
  }>;
  analysisWindow: number; // days
}

/**
 * Score mobile behavior discipline
 */
export async function scoreBehaviorSignalModule(
  farmerId: string,
  logger: GramCreditTraceLogger,
  mockMode: boolean = false,
  customData?: BehaviorSignalData,
): Promise<BehaviorModuleOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    logger.logInput("behavior_signal", {
      farmerId,
      analysisWindow: config.behavior.consistencyWindowDays,
      mockMode,
    });

    // ========== Get Behavior Data ==========
    let behaviorData: BehaviorSignalData;

    if (customData) {
      behaviorData = customData;
    } else if (mockMode) {
      throw new Error(
        "Behavior mock mode is disabled. Provide real transaction/recharge data.",
      );
    } else {
      behaviorData = await fetchBehaviorSignalData(
        farmerId,
        config.behavior.consistencyWindowDays,
      );
    }

    if (
      behaviorData.upiTransactions.length === 0 &&
      behaviorData.recharges.length === 0
    ) {
      return createErrorOutput(
        "behavior_signal",
        "No transaction data available",
        "BEHAVIOR_NO_DATA",
        0,
        {},
      );
    }

    // ========== Analyze UPI Patterns ==========
    const upiMetrics = analyzeUPITransactions(
      behaviorData.upiTransactions,
      config.behavior.minTransactionsRequired,
    );

    logModuleProcessing(logger, "behavior_signal", "upi_analysis_complete", {
      transactionCount: behaviorData.upiTransactions.length,
      frequency: upiMetrics.frequency,
      consistency: upiMetrics.consistency,
      trend: upiMetrics.trend,
    });

    // ========== Analyze Recharge Patterns ==========
    const rechargeMetrics = analyzeRechargePatterns(
      behaviorData.recharges,
      behaviorData.analysisWindow,
    );

    logModuleProcessing(
      logger,
      "behavior_signal",
      "recharge_analysis_complete",
      {
        rechargeCount: behaviorData.recharges.length,
        regularity: rechargeMetrics.regularity,
        consistency: rechargeMetrics.consistency,
      },
    );

    // ========== Detect Anomalies ==========
    const anomalyDetected = detectAnomalies(
      behaviorData.upiTransactions,
      behaviorData.recharges,
      config.behavior.anomalyThreshold,
    );

    if (anomalyDetected) {
      logger.logValidation(
        "behavior_signal",
        false,
        "Anomalies detected in behavior pattern",
      );
    }

    // ========== Compute Discipline Score ==========
    const disciplineScore = computeDisciplineScore(
      upiMetrics,
      rechargeMetrics,
      anomalyDetected,
      config.behavior,
    );

    // ========== Compute Confidence ==========
    const confidence = computeConfidence(
      behaviorData.upiTransactions.length,
      behaviorData.recharges.length,
      config.behavior.minTransactionsRequired,
    );

    const reasonCode = generateReasonCode(disciplineScore, anomalyDetected);

    logModuleProcessing(
      logger,
      "behavior_signal",
      "final_score",
      {
        disciplineScore,
        confidence,
        reasonCode,
        upiMetrics,
        rechargeMetrics,
      },
      Date.now() - startTime,
    );

    const metrics: BehaviorMetrics = {
      upiTransactionCount: behaviorData.upiTransactions.length,
      upiFrequencyRegularity: upiMetrics.consistency,
      upiAverageAmountTrend: upiMetrics.trend,
      rechargeFrequencyDays: rechargeMetrics.avgIntervalDays,
      rechargeConsistency: rechargeMetrics.consistency,
      inactivityAlerts: upiMetrics.inactivityAlerts,
      anomalyDetected,
    };

    const response: BehaviorModuleOutput = {
      score: disciplineScore,
      confidence,
      reasonCode,
      details: metrics,
      metadata: {
        moduleId: "behavior_signal",
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  } catch (error) {
    logger.logError("behavior_signal", error);

    return createErrorOutput(
      "behavior_signal",
      error instanceof Error ? error.message : String(error),
      "BEHAVIOR_PROCESSING_ERROR",
      0,
      {},
    );
  }
}

// ========== UPI Analysis ==========

interface UPIMetrics {
  frequency: number; // transactions/month
  consistency: number; // 0-100 regularity score
  trend: "increasing" | "stable" | "decreasing";
  inactivityAlerts: number; // gaps > threshold
  averageAmount: number;
}

function analyzeUPITransactions(
  transactions: Array<{ date: Date; amount: number; type: string }>,
  minRequired: number,
): UPIMetrics {
  if (transactions.length < minRequired) {
    return {
      frequency: 0,
      consistency: 0,
      trend: "decreasing",
      inactivityAlerts: 1,
      averageAmount: 0,
    };
  }

  // Sort by date
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // Compute frequency (transactions per 30 days)
  const oldestDate = sorted[0].date;
  const newestDate = sorted[sorted.length - 1].date;
  const daysDifference = Math.max(
    1,
    Math.floor(
      (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const frequency = (transactions.length / daysDifference) * 30;

  // Compute consistency (regularity of intervals)
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.floor(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days > 0) {
      intervals.push(days);
    }
  }

  let consistency = 50;
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance =
      intervals.reduce((sum, x) => sum + Math.pow(x - avgInterval, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);
    const coeffVariation = stdDev / (avgInterval === 0 ? 1 : avgInterval);
    consistency = Math.max(0, 100 - coeffVariation * 50); // Lower CV = higher consistency
  }

  // Compute trend (recent vs old average)
  const midpoint = Math.floor(sorted.length / 2);
  const oldAverage =
    sorted.slice(0, midpoint).reduce((sum, t) => sum + t.amount, 0) / midpoint;
  const newAverage =
    sorted.slice(midpoint).reduce((sum, t) => sum + t.amount, 0) /
    (sorted.length - midpoint);
  const trend: "increasing" | "stable" | "decreasing" =
    newAverage > oldAverage * 1.1
      ? "increasing"
      : newAverage < oldAverage * 0.9
        ? "decreasing"
        : "stable";

  // Count inactivity alerts (gaps > 15 days)
  let inactivityAlerts = 0;
  const INACTIVITY_THRESHOLD = 15;
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.floor(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days > INACTIVITY_THRESHOLD) {
      inactivityAlerts++;
    }
  }

  const averageAmount =
    transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;

  return {
    frequency,
    consistency,
    trend,
    inactivityAlerts,
    averageAmount,
  };
}

// ========== Recharge Analysis ==========

interface RechargeMetrics {
  avgIntervalDays: number;
  consistency: number; // 0-100
}

function analyzeRechargePatterns(
  recharges: Array<{ date: Date; amount: number }>,
  windowDays: number,
): RechargeMetrics {
  if (recharges.length < 2) {
    return {
      avgIntervalDays: windowDays,
      consistency: 0,
    };
  }

  const sorted = [...recharges].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.floor(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days > 0) {
      intervals.push(days);
    }
  }

  if (intervals.length === 0) {
    return {
      avgIntervalDays: windowDays,
      consistency: 0,
    };
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, x) => sum + Math.pow(x - avgInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const coeffVariation = stdDev / (avgInterval === 0 ? 1 : avgInterval);
  const consistency = Math.max(0, 100 - coeffVariation * 50);

  return {
    avgIntervalDays: Math.round(avgInterval),
    consistency,
  };
}

// ========== Anomaly Detection ==========

function detectAnomalies(
  upiTransactions: Array<{ date: Date; amount: number }>,
  recharges: Array<{ date: Date; amount: number }>,
  threshold: number,
): boolean {
  // Flag 1: Sudden inactivity
  if (upiTransactions.length > 0) {
    const lastTx = upiTransactions[upiTransactions.length - 1].date;
    const daysSinceLastTx = Math.floor(
      (Date.now() - lastTx.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastTx > threshold * 10) {
      return true; // No activity for 30+ days
    }
  }

  // Flag 2: Unusual transaction amounts (> 3x average)
  if (upiTransactions.length > 2) {
    const avgAmount =
      upiTransactions.reduce((sum, t) => sum + t.amount, 0) /
      upiTransactions.length;
    const maxAmount = Math.max(...upiTransactions.map((t) => t.amount));
    if (maxAmount > avgAmount * 5) {
      return true;
    }
  }

  return false;
}

async function fetchBehaviorSignalData(
  farmerId: string,
  analysisWindowDays: number,
): Promise<BehaviorSignalData> {
  const config = getGramCreditConfig();
  const connectorUrl = config.behavior.connectorUrl;

  if (!connectorUrl) {
    throw new Error(
      "GRAMCREDIT_BEHAVIOR_CONNECTOR_URL is required for real behavior scoring.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.behavior.connectorApiKey) {
    headers["x-api-key"] = config.behavior.connectorApiKey;
  }

  const response = await fetch(connectorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      farmerId,
      analysisWindowDays,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Behavior connector request failed (${response.status}): ${responseText.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  return parseBehaviorSignalData(payload, analysisWindowDays);
}

function parseBehaviorSignalData(
  payload: unknown,
  analysisWindowDays: number,
): BehaviorSignalData {
  if (!payload || typeof payload !== "object") {
    throw new Error("Behavior connector response must be a JSON object.");
  }

  const source = payload as {
    upiTransactions?: unknown;
    recharges?: unknown;
  };

  if (!Array.isArray(source.upiTransactions)) {
    throw new Error(
      "Behavior connector response missing 'upiTransactions' array.",
    );
  }
  if (!Array.isArray(source.recharges)) {
    throw new Error("Behavior connector response missing 'recharges' array.");
  }

  return {
    upiTransactions: source.upiTransactions.map(parseUpiTransaction),
    recharges: source.recharges.map(parseRecharge),
    analysisWindow: analysisWindowDays,
  };
}

function parseUpiTransaction(value: unknown): {
  date: Date;
  amount: number;
  type: "credit" | "debit";
} {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid UPI transaction entry: expected object.");
  }

  const source = value as {
    date?: unknown;
    amount?: unknown;
    type?: unknown;
  };
  const date = parseDate(source.date, "upiTransactions[].date");
  const amount = parseFiniteNumber(source.amount, "upiTransactions[].amount");

  if (source.type !== "credit" && source.type !== "debit") {
    throw new Error(
      "Invalid upiTransactions[].type: expected 'credit' or 'debit'.",
    );
  }

  return {
    date,
    amount,
    type: source.type,
  };
}

function parseRecharge(value: unknown): { date: Date; amount: number } {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid recharge entry: expected object.");
  }

  const source = value as {
    date?: unknown;
    amount?: unknown;
  };

  return {
    date: parseDate(source.date, "recharges[].date"),
    amount: parseFiniteNumber(source.amount, "recharges[].amount"),
  };
}

function parseDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(
      `Invalid ${fieldName}: expected string or number timestamp.`,
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: invalid date value.`);
  }
  return parsed;
}

function parseFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${fieldName}: expected finite number.`);
  }
  return value;
}

// ========== Discipline Score Computation ==========

function computeDisciplineScore(
  upiMetrics: UPIMetrics,
  rechargeMetrics: RechargeMetrics,
  anomalyDetected: boolean,
  config: {
    rechargeRegularityWeight: number;
    transactionFrequencyWeight: number;
  },
): number {
  let score = 50; // baseline

  // UPI frequency component (normalized to 0-100)
  const upiFrequencyScore = Math.min(100, upiMetrics.frequency * 3); // ~10 tx/month = 30 points
  score += upiFrequencyScore * config.transactionFrequencyWeight;

  // UPI consistency
  score += upiMetrics.consistency * 0.2;

  // Recharge regularity
  score += rechargeMetrics.consistency * config.rechargeRegularityWeight;

  // Trend bonus/penalty
  switch (upiMetrics.trend) {
    case "increasing":
      score += 10;
      break;
    case "decreasing":
      score -= 15;
      break;
  }

  // Inactivity penalty
  score -= upiMetrics.inactivityAlerts * 20;

  // Anomaly penalty
  if (anomalyDetected) {
    score *= 0.6;
  }

  return validateScore(score, 0, 100, 50);
}

// ========== Confidence Computation ==========

function computeConfidence(
  upiCount: number,
  rechargeCount: number,
  minRequired: number,
): number {
  const totalDataPoints = upiCount + rechargeCount;

  if (totalDataPoints < minRequired) {
    return Math.min(0.5, totalDataPoints / minRequired);
  }

  return Math.min(
    0.95,
    0.7 + ((totalDataPoints - minRequired) / (minRequired * 2)) * 0.25,
  );
}

// ========== Reason Code Generation ==========

function generateReasonCode(score: number, anomalyDetected: boolean): string {
  if (anomalyDetected) {
    return "BEHAVIOR_ANOMALY_DETECTED";
  }

  if (score >= 75) {
    return "BEHAVIOR_CONSISTENT_DISCIPLINE";
  } else if (score >= 60) {
    return "BEHAVIOR_MODERATE_DISCIPLINE";
  } else if (score >= 40) {
    return "BEHAVIOR_IRREGULAR_PATTERN";
  } else {
    return "BEHAVIOR_POOR_DISCIPLINE";
  }
}

export type { BehaviorMetrics };
