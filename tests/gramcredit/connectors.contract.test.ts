import assert from "node:assert/strict";

import { resetGramCreditConfig } from "../../lib/gramcredit/core/config";
import { createTraceLogger } from "../../lib/gramcredit/core/trace-logger";
import { scoreSocialGraphModule } from "../../lib/gramcredit/engines/social-graph";
import { scoreBehaviorSignalModule } from "../../lib/gramcredit/engines/behavior-signal";
import { scoreSatelliteCropModule } from "../../lib/gramcredit/engines/satellite-crop";

type AsyncCase = {
  name: string;
  run: () => Promise<void>;
};

const BASE_ENV: Record<string, string> = {
  GRAMCREDIT_WEIGHT_VOICE: "0.25",
  GRAMCREDIT_WEIGHT_SOCIAL: "0.30",
  GRAMCREDIT_WEIGHT_SATELLITE: "0.30",
  GRAMCREDIT_WEIGHT_BEHAVIOR: "0.15",
  GRAMCREDIT_ENABLE_TRACES: "false",
  GRAMCREDIT_SATELLITE_PROVIDER: "bhuvan",
};

async function withEnvironment(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const keys = new Set([...Object.keys(BASE_ENV), ...Object.keys(overrides)]);
  const previous = new Map<string, string | undefined>();

  for (const key of keys) {
    previous.set(key, process.env[key]);
  }

  try {
    for (const [key, value] of Object.entries(BASE_ENV)) {
      process.env[key] = value;
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    resetGramCreditConfig();
    await fn();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetGramCreditConfig();
  }
}

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
}): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => ({
    ok: response.ok,
    status: response.status,
    json: async () => response.json,
    text: async () => response.text || JSON.stringify(response.json || {}),
  })) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function createLogger() {
  return createTraceLogger("APP_CONNECTOR_TEST", "farmer_test");
}

const tests: AsyncCase[] = [
  {
    name: "social connector returns processing error when connector URL is missing",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_SOCIAL_CONNECTOR_URL: undefined,
        },
        async () => {
          const result = await scoreSocialGraphModule(
            "farmer_test",
            createLogger(),
            false,
          );

          assert.equal(result.reasonCode, "SOCIAL_PROCESSING_ERROR");
          assert.equal(result.score, 0);
          assert.equal(result.confidence, 0);
        },
      );
    },
  },
  {
    name: "social connector accepts valid payload contract",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_SOCIAL_CONNECTOR_URL: "https://connector.test/social",
          GRAMCREDIT_SOCIAL_USE_GNN_MODEL: "false",
        },
        async () => {
          const restoreFetch = mockFetchOnce({
            ok: true,
            status: 200,
            json: {
              nodes: [
                {
                  farmerId: "farmer_test",
                  transactionVolume: 180000,
                  transactionFrequency: 18,
                  repaymentHistory: {
                    onTimePayments: 12,
                    latePayments: 1,
                    defaultedPayments: 0,
                  },
                },
                {
                  farmerId: "peer_1",
                  transactionVolume: 90000,
                  transactionFrequency: 10,
                  repaymentHistory: {
                    onTimePayments: 8,
                    latePayments: 1,
                    defaultedPayments: 0,
                  },
                },
              ],
              edges: [
                {
                  source: "farmer_test",
                  target: "peer_1",
                  weight: 0.78,
                  frequency: 7,
                },
              ],
            },
          });

          try {
            const result = await scoreSocialGraphModule(
              "farmer_test",
              createLogger(),
              false,
            );

            assert.notEqual(result.reasonCode, "SOCIAL_PROCESSING_ERROR");
            assert.ok(result.score >= 0 && result.score <= 100);
            assert.ok(result.confidence >= 0 && result.confidence <= 1);
          } finally {
            restoreFetch();
          }
        },
      );
    },
  },
  {
    name: "behavior connector returns processing error when connector URL is missing",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_BEHAVIOR_CONNECTOR_URL: undefined,
        },
        async () => {
          const result = await scoreBehaviorSignalModule(
            "farmer_test",
            createLogger(),
            false,
          );

          assert.equal(result.reasonCode, "BEHAVIOR_PROCESSING_ERROR");
          assert.equal(result.score, 0);
          assert.equal(result.confidence, 0);
        },
      );
    },
  },
  {
    name: "behavior connector accepts valid payload contract",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_BEHAVIOR_CONNECTOR_URL: "https://connector.test/behavior",
        },
        async () => {
          const restoreFetch = mockFetchOnce({
            ok: true,
            status: 200,
            json: {
              upiTransactions: [
                {
                  date: "2026-03-01T00:00:00.000Z",
                  amount: 1200,
                  type: "credit",
                },
                {
                  date: "2026-03-10T00:00:00.000Z",
                  amount: 1400,
                  type: "debit",
                },
                {
                  date: "2026-03-18T00:00:00.000Z",
                  amount: 1350,
                  type: "credit",
                },
                {
                  date: "2026-03-25T00:00:00.000Z",
                  amount: 1500,
                  type: "debit",
                },
                {
                  date: "2026-04-01T00:00:00.000Z",
                  amount: 1600,
                  type: "credit",
                },
                {
                  date: "2026-04-05T00:00:00.000Z",
                  amount: 1250,
                  type: "debit",
                },
                {
                  date: "2026-04-10T00:00:00.000Z",
                  amount: 1700,
                  type: "credit",
                },
                {
                  date: "2026-04-12T00:00:00.000Z",
                  amount: 1450,
                  type: "debit",
                },
                {
                  date: "2026-04-14T00:00:00.000Z",
                  amount: 1550,
                  type: "credit",
                },
                {
                  date: "2026-04-15T00:00:00.000Z",
                  amount: 1650,
                  type: "debit",
                },
              ],
              recharges: [
                { date: "2026-03-03T00:00:00.000Z", amount: 199 },
                { date: "2026-03-17T00:00:00.000Z", amount: 239 },
                { date: "2026-04-02T00:00:00.000Z", amount: 249 },
              ],
            },
          });

          try {
            const result = await scoreBehaviorSignalModule(
              "farmer_test",
              createLogger(),
              false,
            );

            assert.notEqual(result.reasonCode, "BEHAVIOR_PROCESSING_ERROR");
            assert.ok(result.score >= 0 && result.score <= 100);
            assert.ok(result.confidence >= 0 && result.confidence <= 1);
          } finally {
            restoreFetch();
          }
        },
      );
    },
  },
  {
    name: "satellite connector rejects payload when source does not match provider",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_SATELLITE_PROVIDER: "bhuvan",
          GRAMCREDIT_SATELLITE_CONNECTOR_URL:
            "https://connector.test/satellite",
        },
        async () => {
          const restoreFetch = mockFetchOnce({
            ok: true,
            status: 200,
            json: {
              ndvi: 0.62,
              cloudCover: 12,
              imageDate: "2026-04-01",
              source: "sentinel",
            },
          });

          try {
            const result = await scoreSatelliteCropModule(
              { latitude: 20.1, longitude: 78.1 },
              "wheat",
              undefined,
              createLogger(),
              false,
            );

            assert.equal(result.reasonCode, "SATELLITE_PROCESSING_ERROR");
            assert.equal(result.score, 0);
            assert.equal(result.confidence, 0);
          } finally {
            restoreFetch();
          }
        },
      );
    },
  },
  {
    name: "satellite connector accepts valid payload contract",
    run: async () => {
      await withEnvironment(
        {
          GRAMCREDIT_SATELLITE_PROVIDER: "bhuvan",
          GRAMCREDIT_SATELLITE_CONNECTOR_URL:
            "https://connector.test/satellite",
        },
        async () => {
          const restoreFetch = mockFetchOnce({
            ok: true,
            status: 200,
            json: {
              ndvi: 0.66,
              cloudCover: 14,
              imageDate: "2026-04-02",
              source: "bhuvan",
            },
          });

          try {
            const result = await scoreSatelliteCropModule(
              { latitude: 20.1, longitude: 78.1 },
              "wheat",
              undefined,
              createLogger(),
              false,
            );

            assert.notEqual(result.reasonCode, "SATELLITE_PROCESSING_ERROR");
            assert.ok(result.score >= 0 && result.score <= 100);
            assert.ok(result.confidence >= 0 && result.confidence <= 1);
            assert.equal(result.details.imageDate, "2026-04-02");
          } finally {
            restoreFetch();
          }
        },
      );
    },
  },
];

async function run(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      console.log(`PASS: ${test.name}`);
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.stack || error.message : String(error);
      console.error(`FAIL: ${test.name}`);
      console.error(message);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`Connector contract tests failed: ${failed}`);
  }

  console.log(`All connector contract tests passed (${tests.length}).`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
