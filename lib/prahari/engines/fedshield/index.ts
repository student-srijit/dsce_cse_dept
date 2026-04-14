import {
  clamp,
  mean,
  normalizeRatio,
  toPercent,
  weightedAverage,
} from "../../core/scoring";
import type {
  FederatedClientMetrics,
  PrahariModuleOutput,
} from "../../core/types";

export function scoreFedShield(
  clients: FederatedClientMetrics[],
): PrahariModuleOutput<Record<string, number>> {
  const start = Date.now();

  const clientCount = clients.length;
  const suspiciousCount = clients.filter((client) => client.suspiciousUpdate).length;
  const avgAuc = mean(clients.map((client) => client.localAuc));
  const avgGradientNorm = mean(clients.map((client) => client.gradientNorm));
  const totalSamples = clients.reduce((acc, client) => acc + client.sampleCount, 0);

  const suspiciousRatio = normalizeRatio(suspiciousCount, Math.max(clientCount, 1));
  const lowAucRisk = clamp(1 - normalizeRatio(avgAuc, 0.95), 0, 1);
  const gradientExplosionRisk = clamp(normalizeRatio(avgGradientNorm, 12), 0, 1);
  const lowParticipationRisk = clamp(1 - normalizeRatio(clientCount, 40), 0, 1);

  const risk01 = weightedAverage(
    [suspiciousRatio, lowAucRisk, gradientExplosionRisk, lowParticipationRisk],
    [0.35, 0.2, 0.24, 0.21],
    0,
  );

  const confidence = clamp(
    weightedAverage(
      [normalizeRatio(clientCount, 40), normalizeRatio(totalSamples, 500000)],
      [0.5, 0.5],
      0.25,
    ),
    0.25,
    0.99,
  );

  const reasonCodes: string[] = [];
  if (suspiciousRatio > 0.2) reasonCodes.push("FEDSHIELD_SUSPICIOUS_GRADIENTS");
  if (lowParticipationRisk > 0.45) reasonCodes.push("FEDSHIELD_LOW_CLIENT_PARTICIPATION");
  if (gradientExplosionRisk > 0.5) reasonCodes.push("FEDSHIELD_GRADIENT_NORM_ALERT");
  if (reasonCodes.length === 0) reasonCodes.push("FEDSHIELD_STABLE_FEDERATION");

  return {
    riskScore: toPercent(risk01),
    confidence,
    reasonCodes,
    details: {
      clientCount,
      suspiciousCount,
      suspiciousRatio,
      avgAuc,
      avgGradientNorm,
      totalSamples,
      lowAucRisk,
      gradientExplosionRisk,
      lowParticipationRisk,
      risk01,
    },
    metadata: {
      moduleId: "fedshield",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
