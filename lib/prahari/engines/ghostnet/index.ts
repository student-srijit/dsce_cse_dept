import {
  clamp,
  normalizeRatio,
  toPercent,
  weightedAverage,
} from "../../core/scoring";
import type { BeneficiaryRecord, PrahariModuleOutput } from "../../core/types";

export function scoreGhostNet(
  records: BeneficiaryRecord[],
): PrahariModuleOutput<Record<string, number>> {
  const start = Date.now();

  const byBank = new Map<string, number>();
  const byAddress = new Map<string, number>();
  const byAadhaar = new Map<string, number>();

  for (const record of records) {
    byBank.set(record.bankAccountHash, (byBank.get(record.bankAccountHash) || 0) + 1);
    byAddress.set(record.addressHash, (byAddress.get(record.addressHash) || 0) + 1);
    byAadhaar.set(record.aadhaarHash, (byAadhaar.get(record.aadhaarHash) || 0) + 1);
  }

  const sharedBankLinks = Array.from(byBank.values()).filter((count) => count > 1).length;
  const denseAddressLinks = Array.from(byAddress.values()).filter(
    (count) => count >= 5,
  ).length;
  const duplicateIdentityLinks = Array.from(byAadhaar.values()).filter(
    (count) => count > 1,
  ).length;

  const dormantActivationCount = records.filter(
    (record) => record.dormantBeforePayout,
  ).length;

  const highBiometricFailureCount = records.filter(
    (record) => record.biometricFailureCount >= 3,
  ).length;

  const enrollmentSpreadDays = (() => {
    if (records.length <= 1) return 0;
    const sorted = records
      .map((record) => record.enrollmentTimestamp)
      .sort((a, b) => a - b);
    return (sorted[sorted.length - 1] - sorted[0]) / (24 * 60 * 60 * 1000);
  })();

  const ghostClusterRisk = clamp(normalizeRatio(denseAddressLinks, 4), 0, 1);
  const sharedBankRisk = clamp(normalizeRatio(sharedBankLinks, 8), 0, 1);
  const duplicateIdentityRisk = clamp(normalizeRatio(duplicateIdentityLinks, 5), 0, 1);
  const dormantActivationRisk = normalizeRatio(
    dormantActivationCount,
    Math.max(records.length, 1),
  );
  const biometricFailureRisk = normalizeRatio(
    highBiometricFailureCount,
    Math.max(records.length, 1),
  );
  const enrollmentVelocityRisk = clamp(1 - normalizeRatio(enrollmentSpreadDays, 90), 0, 1);

  const risk01 = weightedAverage(
    [
      ghostClusterRisk,
      sharedBankRisk,
      duplicateIdentityRisk,
      dormantActivationRisk,
      biometricFailureRisk,
      enrollmentVelocityRisk,
    ],
    [0.22, 0.18, 0.2, 0.16, 0.14, 0.1],
    0,
  );

  const confidence = clamp(normalizeRatio(records.length, 500), 0.25, 0.99);

  const reasonCodes: string[] = [];
  if (ghostClusterRisk > 0.5) reasonCodes.push("GHOSTNET_ADDRESS_CLUSTER");
  if (sharedBankRisk > 0.45) reasonCodes.push("GHOSTNET_SHARED_BANK_ACCOUNT");
  if (duplicateIdentityRisk > 0.3) reasonCodes.push("GHOSTNET_DUPLICATE_AADHAAR_HASH");
  if (reasonCodes.length === 0) reasonCodes.push("GHOSTNET_LOW_GHOST_RISK");

  return {
    riskScore: toPercent(risk01),
    confidence,
    reasonCodes,
    details: {
      recordCount: records.length,
      sharedBankLinks,
      denseAddressLinks,
      duplicateIdentityLinks,
      dormantActivationCount,
      highBiometricFailureCount,
      enrollmentSpreadDays,
      ghostClusterRisk,
      sharedBankRisk,
      duplicateIdentityRisk,
      dormantActivationRisk,
      biometricFailureRisk,
      enrollmentVelocityRisk,
    },
    metadata: {
      moduleId: "ghostnet",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
