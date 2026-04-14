import {
  clamp,
  mean,
  normalizeRatio,
  stdDev,
  toPercent,
  weightedAverage,
} from "../../core/scoring";
import type { BehaviorSession, PrahariModuleOutput } from "../../core/types";

function zDistance(current: number, values: number[]): number {
  const avg = mean(values);
  const sd = stdDev(values);
  if (sd === 0) {
    return 0;
  }
  return Math.abs(current - avg) / sd;
}

export function scoreBioSentinel(
  baseline: BehaviorSession[],
  current: BehaviorSession,
): PrahariModuleOutput<Record<string, number>> {
  const start = Date.now();

  const pressureZ = zDistance(
    current.averageTouchPressure,
    baseline.map((item) => item.averageTouchPressure),
  );
  const swipeZ = zDistance(
    current.averageSwipeVelocity,
    baseline.map((item) => item.averageSwipeVelocity),
  );
  const keyIntervalZ = zDistance(
    current.averageInterKeyIntervalMs,
    baseline.map((item) => item.averageInterKeyIntervalMs),
  );
  const accelZ = zDistance(
    current.accelerometerVariance,
    baseline.map((item) => item.accelerometerVariance),
  );
  const pacingZ = zDistance(
    current.pacingSecondsBetweenActions,
    baseline.map((item) => item.pacingSecondsBetweenActions),
  );

  const anomaly01 = weightedAverage(
    [
      clamp(normalizeRatio(pressureZ, 4), 0, 1),
      clamp(normalizeRatio(swipeZ, 4), 0, 1),
      clamp(normalizeRatio(keyIntervalZ, 4), 0, 1),
      clamp(normalizeRatio(accelZ, 4), 0, 1),
      clamp(normalizeRatio(pacingZ, 4), 0, 1),
    ],
    [0.18, 0.2, 0.22, 0.2, 0.2],
    0,
  );

  const confidence = clamp(normalizeRatio(baseline.length, 20), 0.2, 0.98);
  const reasonCodes: string[] = [];

  if (anomaly01 > 0.7) reasonCodes.push("BIOSENTINEL_HIGH_BEHAVIOR_ANOMALY");
  if (keyIntervalZ > 3) reasonCodes.push("BIOSENTINEL_KEYSTROKE_DRIFT");
  if (swipeZ > 3) reasonCodes.push("BIOSENTINEL_SWIPE_PATTERN_SHIFT");
  if (reasonCodes.length === 0) reasonCodes.push("BIOSENTINEL_BASELINE_MATCH");

  return {
    riskScore: toPercent(anomaly01),
    confidence,
    reasonCodes,
    details: {
      baselineCount: baseline.length,
      pressureZ,
      swipeZ,
      keyIntervalZ,
      accelZ,
      pacingZ,
      anomaly01,
    },
    metadata: {
      moduleId: "biosentinel",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
