import {
  clamp,
  normalizeRatio,
  toPercent,
  weightedAverage,
} from "../../core/scoring";
import type {
  PrahariModuleOutput,
  UpiTransactionEvent,
  UpiUserFeature,
} from "../../core/types";

export function scoreTransFraud(
  transactionSequence: UpiTransactionEvent[],
  userFeatures: UpiUserFeature[],
): PrahariModuleOutput<Record<string, number>> {
  const start = Date.now();

  const txCount = transactionSequence.length;
  const uniqueMerchants = new Set(
    transactionSequence.map((txn) => txn.merchantId),
  ).size;
  const uniqueGeo = new Set(transactionSequence.map((txn) => txn.geoCluster)).size;

  const avgAmount =
    txCount === 0
      ? 0
      : transactionSequence.reduce((acc, txn) => acc + txn.amount, 0) / txCount;

  const oddHourCount = transactionSequence.filter(
    (txn) => txn.hourOfDay <= 5 || txn.hourOfDay >= 23,
  ).length;

  const velocityRisk = clamp(normalizeRatio(txCount, 60), 0, 1);
  const oddHourRisk = normalizeRatio(oddHourCount, Math.max(txCount, 1));
  const geoSpreadRisk = clamp(normalizeRatio(uniqueGeo, 6), 0, 1);
  const merchantEntropyRisk = clamp(normalizeRatio(uniqueMerchants, 20), 0, 1);
  const amountRisk = clamp(normalizeRatio(avgAmount, 50000), 0, 1);

  const linkedUsers = userFeatures.filter((feature) =>
    transactionSequence.some((txn) => txn.userId === feature.userId),
  );

  const knownFraudLinkRisk = clamp(
    normalizeRatio(
      linkedUsers.reduce((acc, item) => acc + item.knownFraudLinks, 0),
      Math.max(linkedUsers.length * 3, 1),
    ),
    0,
    1,
  );

  const velocitySpikeRisk = clamp(
    weightedAverage(
      linkedUsers.map((user) => user.velocitySpikeRatio),
      linkedUsers.map(() => 1),
      0,
    ),
    0,
    1,
  );

  const risk01 = weightedAverage(
    [
      velocityRisk,
      oddHourRisk,
      geoSpreadRisk,
      merchantEntropyRisk,
      amountRisk,
      knownFraudLinkRisk,
      velocitySpikeRisk,
    ],
    [0.2, 0.12, 0.14, 0.12, 0.12, 0.17, 0.13],
    0,
  );

  const confidence = clamp(
    weightedAverage(
      [normalizeRatio(txCount, 30), normalizeRatio(linkedUsers.length, 8)],
      [0.65, 0.35],
      0.2,
    ),
    0.2,
    0.98,
  );

  const details = {
    txCount,
    avgAmount,
    uniqueMerchants,
    uniqueGeo,
    oddHourCount,
    velocityRisk,
    oddHourRisk,
    geoSpreadRisk,
    merchantEntropyRisk,
    amountRisk,
    knownFraudLinkRisk,
    velocitySpikeRisk,
  };

  const reasonCodes: string[] = [];
  if (velocityRisk > 0.7) reasonCodes.push("TRANSFRAUD_HIGH_TXN_VELOCITY");
  if (oddHourRisk > 0.4) reasonCodes.push("TRANSFRAUD_ODD_HOUR_PATTERN");
  if (knownFraudLinkRisk > 0.45) reasonCodes.push("TRANSFRAUD_FRAUD_LINKED_USERS");
  if (reasonCodes.length === 0) reasonCodes.push("TRANSFRAUD_LOW_RISK_PATTERN");

  return {
    riskScore: toPercent(risk01),
    confidence,
    reasonCodes,
    details,
    metadata: {
      moduleId: "transfraud",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
