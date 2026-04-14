import assert from "node:assert/strict";

function createRequest(body: unknown): any {
  return {
    json: async () => body,
  };
}

async function run(): Promise<void> {
  const route = await import("../../app/api/prahari/score/route");

  const invalid = await route.POST(createRequest({}));
  assert.equal(invalid.status, 400);

  const validPayload = {
    transactionSequence: [
      {
        id: "t1",
        userId: "u1",
        merchantId: "m1",
        amount: 1500,
        hourOfDay: 11,
        geoCluster: "g1",
        deviceHash: "d1",
        upiHandle: "u1@upi",
      },
    ],
    userFeatures: [
      {
        userId: "u1",
        transactionCount30d: 20,
        averageAmount: 1800,
        velocitySpikeRatio: 0.2,
        knownFraudLinks: 0,
      },
    ],
    beneficiaryRecords: [
      {
        beneficiaryId: "b1",
        aadhaarHash: "a1",
        bankAccountHash: "bank1",
        addressHash: "addr1",
        mobileHash: "mob1",
        schemeId: "scheme1",
        enrollmentTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        dormantBeforePayout: false,
        biometricFailureCount: 0,
      },
    ],
    kycSignals: {
      fontConsistency: 0.9,
      pixelNoiseIntegrity: 0.88,
      qrMatchScore: 0.9,
      microPrintIntegrity: 0.86,
      laminateReflectionScore: 0.89,
      nameMatchScore: 0.92,
    },
    faceSignals: {
      blinkConsistency: 0.9,
      textureAuthenticity: 0.9,
      frequencyArtifactRisk: 0.1,
    },
    baselineBehavior: Array.from({ length: 8 }).map((_, idx) => ({
      userId: "u1",
      averageTouchPressure: 0.5 + idx * 0.01,
      averageSwipeVelocity: 1.2 + idx * 0.02,
      averageInterKeyIntervalMs: 190 + idx,
      accelerometerVariance: 0.25 + idx * 0.005,
      pacingSecondsBetweenActions: 3.8 + idx * 0.04,
    })),
    currentBehavior: {
      userId: "u1",
      averageTouchPressure: 0.54,
      averageSwipeVelocity: 1.35,
      averageInterKeyIntervalMs: 194,
      accelerometerVariance: 0.28,
      pacingSecondsBetweenActions: 4.0,
    },
    federatedClients: [
      {
        clientId: "bank_1",
        localAuc: 0.88,
        gradientNorm: 4.2,
        sampleCount: 12000,
        suspiciousUpdate: false,
      },
    ],
  };

  const ok = await route.POST(createRequest(validPayload));
  assert.equal(ok.status, 200);

  const json = (await ok.json()) as {
    ok: boolean;
    fusedRiskScore: number;
    riskDecision: string;
    result?: {
      transFraud?: { riskScore: number };
      fused?: { riskScore: number };
    };
  };

  assert.equal(json.ok, true);
  assert.ok(typeof json.fusedRiskScore === "number");
  assert.ok(["ALLOW", "STEP_UP", "BLOCK"].includes(json.riskDecision));
  assert.ok(typeof json.result?.transFraud?.riskScore === "number");
  assert.ok(typeof json.result?.fused?.riskScore === "number");

  console.log("PRAHARI score API tests passed.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
