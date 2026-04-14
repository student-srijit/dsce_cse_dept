import assert from "node:assert/strict";

import { runPrahariRiskPipeline } from "../../lib/prahari";
import type { PrahariPipelineInput } from "../../lib/prahari";

const input: PrahariPipelineInput = {
  transactionSequence: [
    {
      id: "t1",
      userId: "u1",
      merchantId: "m1",
      amount: 9200,
      hourOfDay: 23,
      geoCluster: "g1",
      deviceHash: "d1",
      upiHandle: "user@upi",
    },
    {
      id: "t2",
      userId: "u1",
      merchantId: "m2",
      amount: 31000,
      hourOfDay: 2,
      geoCluster: "g2",
      deviceHash: "d1",
      upiHandle: "user@upi",
    },
    {
      id: "t3",
      userId: "u1",
      merchantId: "m3",
      amount: 45000,
      hourOfDay: 1,
      geoCluster: "g3",
      deviceHash: "d1",
      upiHandle: "user@upi",
    },
  ],
  userFeatures: [
    {
      userId: "u1",
      transactionCount30d: 76,
      averageAmount: 19700,
      velocitySpikeRatio: 0.74,
      knownFraudLinks: 2,
    },
  ],
  beneficiaryRecords: [
    {
      beneficiaryId: "b1",
      aadhaarHash: "a1",
      bankAccountHash: "bank_shared",
      addressHash: "addr_shared",
      mobileHash: "moba",
      schemeId: "s1",
      enrollmentTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      dormantBeforePayout: true,
      biometricFailureCount: 4,
    },
    {
      beneficiaryId: "b2",
      aadhaarHash: "a2",
      bankAccountHash: "bank_shared",
      addressHash: "addr_shared",
      mobileHash: "mobb",
      schemeId: "s2",
      enrollmentTimestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
      dormantBeforePayout: true,
      biometricFailureCount: 1,
    },
    {
      beneficiaryId: "b3",
      aadhaarHash: "a3",
      bankAccountHash: "bank_shared",
      addressHash: "addr_shared",
      mobileHash: "mobc",
      schemeId: "s3",
      enrollmentTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      dormantBeforePayout: true,
      biometricFailureCount: 5,
    },
  ],
  kycSignals: {
    fontConsistency: 0.46,
    pixelNoiseIntegrity: 0.51,
    qrMatchScore: 0.32,
    microPrintIntegrity: 0.49,
    laminateReflectionScore: 0.55,
    nameMatchScore: 0.62,
  },
  faceSignals: {
    blinkConsistency: 0.44,
    textureAuthenticity: 0.39,
    frequencyArtifactRisk: 0.71,
  },
  baselineBehavior: Array.from({ length: 20 }).map((_, idx) => ({
    userId: "u1",
    averageTouchPressure: 0.52 + idx * 0.001,
    averageSwipeVelocity: 1.42 + idx * 0.005,
    averageInterKeyIntervalMs: 180 + idx,
    accelerometerVariance: 0.2 + idx * 0.003,
    pacingSecondsBetweenActions: 3.5 + idx * 0.03,
  })),
  currentBehavior: {
    userId: "u1",
    averageTouchPressure: 0.88,
    averageSwipeVelocity: 2.85,
    averageInterKeyIntervalMs: 402,
    accelerometerVariance: 0.79,
    pacingSecondsBetweenActions: 8.3,
  },
  federatedClients: [
    {
      clientId: "bank_1",
      localAuc: 0.85,
      gradientNorm: 4.4,
      sampleCount: 12000,
      suspiciousUpdate: false,
    },
    {
      clientId: "bank_2",
      localAuc: 0.79,
      gradientNorm: 9.2,
      sampleCount: 9000,
      suspiciousUpdate: true,
    },
    {
      clientId: "bank_3",
      localAuc: 0.83,
      gradientNorm: 6.1,
      sampleCount: 14000,
      suspiciousUpdate: false,
    },
  ],
};

const output = runPrahariRiskPipeline(input);

assert.ok(output.transFraud.riskScore >= 0 && output.transFraud.riskScore <= 100);
assert.ok(output.ghostNet.riskScore >= 0 && output.ghostNet.riskScore <= 100);
assert.ok(output.deepShield.riskScore >= 0 && output.deepShield.riskScore <= 100);
assert.ok(output.bioSentinel.riskScore >= 0 && output.bioSentinel.riskScore <= 100);
assert.ok(output.fedShield.riskScore >= 0 && output.fedShield.riskScore <= 100);
assert.ok(output.fused.riskScore >= 0 && output.fused.riskScore <= 100);

assert.ok(output.fused.confidence >= 0 && output.fused.confidence <= 1);
assert.ok(output.fused.reasonCodes.length > 0);

console.log("PRAHARI pipeline tests passed.");
