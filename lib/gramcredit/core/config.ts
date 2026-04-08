/**
 * GramCredit Configuration
 * Fully typed, zero hardcoding, loaded from environment + defaults
 * Validates at runtime with Zod
 */

import { z } from "zod";
import type { GramCreditConfig } from "./types";

// ========== Zod Validation Schemas ==========

const SignalWeightsSchema = z.object({
  voice: z.number().min(0).max(1),
  socialGraph: z.number().min(0).max(1),
  satellite: z.number().min(0).max(1),
  behavior: z.number().min(0).max(1),
});

const VoiceConfigSchema = z.object({
  modelId: z.string().default("whisper-1"),
  groqModel: z.string().default("mixtral-8x7b-32768"),
  oceanScaleRange: z.tuple([z.number(), z.number()]).default([0, 100]),
  requiredConfidence: z.number().min(0).max(1).default(0.7),
  interviewLanguage: z.string().default("en"),
  maxAudioDuration: z.number().default(600), // 10 mins
});

const SocialGraphConfigSchema = z.object({
  gnnModelPath: z.string().default("/models/gnn-trust-model.json"),
  transactionThresholdDays: z.number().default(90),
  minClusterSize: z.number().default(3),
  trustNormalization: z.enum(["minmax", "zscore"]).default("minmax"),
  connectorUrl: z.string().url().optional(),
  connectorApiKey: z.string().optional(),
});

const SatelliteConfigSchema = z.object({
  sentinelHubClientId: z.string().optional(),
  sentinelHubSecret: z.string().optional(),
  bhuvanApiKey: z.string().optional(),
  ndviHealthThreshold: z.object({
    healthy: z.number().default(0.5),
    struggling: z.number().default(0.3),
    critical: z.number().default(0.1),
  }),
  anomalyDetectionSensitivity: z.number().default(2.5),
  defaultProvider: z.enum(["sentinel", "bhuvan"]).default("bhuvan"),
  imageSearchWindowDays: z.number().default(30),
  connectorUrl: z.string().url().optional(),
  connectorApiKey: z.string().optional(),
});

const BehaviorConfigSchema = z.object({
  consistencyWindowDays: z.number().default(90),
  minTransactionsRequired: z.number().default(10),
  rechargeRegularityWeight: z.number().min(0).max(1).default(0.4),
  transactionFrequencyWeight: z.number().min(0).max(1).default(0.6),
  anomalyThreshold: z.number().default(3),
  connectorUrl: z.string().url().optional(),
  connectorApiKey: z.string().optional(),
});

const FusionConfigSchema = z.object({
  weights: SignalWeightsSchema,
  normalizationMethod: z.enum(["minmax", "zscore"]).default("minmax"),
  nonlinearTransform: z
    .object({
      type: z.enum(["sigmoid", "relu"]),
      steepness: z.number().optional(),
    })
    .optional(),
});

const DecisionConfigSchema = z.object({
  approvalThresholds: z.object({
    micro: z.number().default(40),
    mini: z.number().default(60),
    standard: z.number().default(75),
  }),
  minimumConfidence: z.number().min(0).max(1).default(0.75),
  eligibilityFilters: z.object({
    minAge: z.number().default(21),
    maxAge: z.number().default(65),
    minPastLoans: z.number().default(0),
  }),
});

const DisbursementBandSchema = z.object({
  scoreMin: z.number(),
  scoreMax: z.number(),
  maxAmount: z.number(),
  tenure: z.number(),
  interestRate: z.number(),
});

const DisbursementConfigSchema = z.object({
  loanBands: z.array(DisbursementBandSchema).default([
    {
      scoreMin: 0,
      scoreMax: 50,
      maxAmount: 5000,
      tenure: 12,
      interestRate: 18,
    },
    {
      scoreMin: 50,
      scoreMax: 70,
      maxAmount: 25000,
      tenure: 18,
      interestRate: 14,
    },
    {
      scoreMin: 70,
      scoreMax: 100,
      maxAmount: 100000,
      tenure: 24,
      interestRate: 10,
    },
  ]),
  repaymentSchedule: z.enum(["weekly", "bi-weekly", "monthly"]).default("bi-weekly"),
  latePaymentPenalty: z.number().default(0.02),
});

const LoggingConfigSchema = z.object({
  enableTraces: z.boolean().default(true),
  persistToDatabase: z.boolean().default(false),
  databaseUrl: z.string().optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const GramCreditConfigSchema = z.object({
  voice: VoiceConfigSchema,
  socialGraph: SocialGraphConfigSchema,
  satellite: SatelliteConfigSchema,
  behavior: BehaviorConfigSchema,
  fusion: FusionConfigSchema,
  decision: DecisionConfigSchema,
  disbursement: DisbursementConfigSchema,
  logging: LoggingConfigSchema,
});

// ========== Configuration Loader ==========

/**
 * Load and validate GramCredit configuration from environment
 * Merges env vars with sensible defaults
 */
export function loadGramCreditConfig(): GramCreditConfig {
  const envConfig = {
    voice: {
      modelId: process.env.GRAMCREDIT_VOICE_MODEL_ID,
      groqModel: process.env.GRAMCREDIT_GROQ_MODEL,
      oceanScaleRange: undefined,
      requiredConfidence:
        process.env.GRAMCREDIT_VOICE_CONFIDENCE &&
        parseFloat(process.env.GRAMCREDIT_VOICE_CONFIDENCE),
      interviewLanguage: process.env.GRAMCREDIT_INTERVIEW_LANGUAGE,
      maxAudioDuration:
        process.env.GRAMCREDIT_MAX_AUDIO_DURATION &&
        parseInt(process.env.GRAMCREDIT_MAX_AUDIO_DURATION),
    },
    socialGraph: {
      gnnModelPath: process.env.GRAMCREDIT_GNN_MODEL_PATH,
      transactionThresholdDays:
        process.env.GRAMCREDIT_TX_THRESHOLD_DAYS &&
        parseInt(process.env.GRAMCREDIT_TX_THRESHOLD_DAYS),
      minClusterSize:
        process.env.GRAMCREDIT_MIN_CLUSTER_SIZE &&
        parseInt(process.env.GRAMCREDIT_MIN_CLUSTER_SIZE),
      trustNormalization: process.env
        .GRAMCREDIT_TRUST_NORMALIZATION as "minmax" | "zscore" | undefined,
      connectorUrl: process.env.GRAMCREDIT_SOCIAL_CONNECTOR_URL,
      connectorApiKey: process.env.GRAMCREDIT_SOCIAL_CONNECTOR_API_KEY,
    },
    satellite: {
      sentinelHubClientId: process.env.SENTINEL_HUB_CLIENT_ID,
      sentinelHubSecret: process.env.SENTINEL_HUB_CLIENT_SECRET,
      bhuvanApiKey: process.env.BHUVAN_API_KEY,
      ndviHealthThreshold: {
        healthy:
          process.env.GRAMCREDIT_NDVI_HEALTHY &&
          parseFloat(process.env.GRAMCREDIT_NDVI_HEALTHY),
        struggling:
          process.env.GRAMCREDIT_NDVI_STRUGGLING &&
          parseFloat(process.env.GRAMCREDIT_NDVI_STRUGGLING),
        critical:
          process.env.GRAMCREDIT_NDVI_CRITICAL &&
          parseFloat(process.env.GRAMCREDIT_NDVI_CRITICAL),
      },
      anomalyDetectionSensitivity:
        process.env.GRAMCREDIT_ANOMALY_SENSITIVITY &&
        parseFloat(process.env.GRAMCREDIT_ANOMALY_SENSITIVITY),
      defaultProvider: process.env
        .GRAMCREDIT_SATELLITE_PROVIDER as "sentinel" | "bhuvan" | undefined,
      imageSearchWindowDays:
        process.env.GRAMCREDIT_IMAGE_SEARCH_DAYS &&
        parseInt(process.env.GRAMCREDIT_IMAGE_SEARCH_DAYS),
      connectorUrl: process.env.GRAMCREDIT_SATELLITE_CONNECTOR_URL,
      connectorApiKey: process.env.GRAMCREDIT_SATELLITE_CONNECTOR_API_KEY,
    },
    behavior: {
      consistencyWindowDays:
        process.env.GRAMCREDIT_CONSISTENCY_WINDOW &&
        parseInt(process.env.GRAMCREDIT_CONSISTENCY_WINDOW),
      minTransactionsRequired:
        process.env.GRAMCREDIT_MIN_TRANSACTIONS &&
        parseInt(process.env.GRAMCREDIT_MIN_TRANSACTIONS),
      rechargeRegularityWeight:
        process.env.GRAMCREDIT_RECHARGE_WEIGHT &&
        parseFloat(process.env.GRAMCREDIT_RECHARGE_WEIGHT),
      transactionFrequencyWeight:
        process.env.GRAMCREDIT_TX_FREQUENCY_WEIGHT &&
        parseFloat(process.env.GRAMCREDIT_TX_FREQUENCY_WEIGHT),
      anomalyThreshold:
        process.env.GRAMCREDIT_BEHAVIOR_ANOMALY_THRESHOLD &&
        parseFloat(process.env.GRAMCREDIT_BEHAVIOR_ANOMALY_THRESHOLD),
      connectorUrl: process.env.GRAMCREDIT_BEHAVIOR_CONNECTOR_URL,
      connectorApiKey: process.env.GRAMCREDIT_BEHAVIOR_CONNECTOR_API_KEY,
    },
    fusion: {
      weights: {
        voice: process.env.GRAMCREDIT_WEIGHT_VOICE && parseFloat(process.env.GRAMCREDIT_WEIGHT_VOICE),
        socialGraph: process.env.GRAMCREDIT_WEIGHT_SOCIAL && parseFloat(process.env.GRAMCREDIT_WEIGHT_SOCIAL),
        satellite: process.env.GRAMCREDIT_WEIGHT_SATELLITE && parseFloat(process.env.GRAMCREDIT_WEIGHT_SATELLITE),
        behavior: process.env.GRAMCREDIT_WEIGHT_BEHAVIOR && parseFloat(process.env.GRAMCREDIT_WEIGHT_BEHAVIOR),
      },
      normalizationMethod: process.env
        .GRAMCREDIT_NORMALIZATION as "minmax" | "zscore" | undefined,
    },
    decision: {
      approvalThresholds: {
        micro:
          process.env.GRAMCREDIT_THRESHOLD_MICRO &&
          parseFloat(process.env.GRAMCREDIT_THRESHOLD_MICRO),
        mini:
          process.env.GRAMCREDIT_THRESHOLD_MINI &&
          parseFloat(process.env.GRAMCREDIT_THRESHOLD_MINI),
        standard:
          process.env.GRAMCREDIT_THRESHOLD_STANDARD &&
          parseFloat(process.env.GRAMCREDIT_THRESHOLD_STANDARD),
      },
      minimumConfidence:
        process.env.GRAMCREDIT_MIN_CONFIDENCE &&
        parseFloat(process.env.GRAMCREDIT_MIN_CONFIDENCE),
      eligibilityFilters: {
        minAge:
          process.env.GRAMCREDIT_MIN_AGE &&
          parseInt(process.env.GRAMCREDIT_MIN_AGE),
        maxAge:
          process.env.GRAMCREDIT_MAX_AGE &&
          parseInt(process.env.GRAMCREDIT_MAX_AGE),
        minPastLoans:
          process.env.GRAMCREDIT_MIN_PAST_LOANS &&
          parseInt(process.env.GRAMCREDIT_MIN_PAST_LOANS),
      },
    },
    disbursement: {},
    logging: {
      enableTraces: process.env.GRAMCREDIT_ENABLE_TRACES !== "false",
      persistToDatabase: process.env.GRAMCREDIT_PERSIST_TRACES === "true",
      databaseUrl: process.env.GRAMCREDIT_DB_URL,
      logLevel: process.env.GRAMCREDIT_LOG_LEVEL as
        | "debug"
        | "info"
        | "warn"
        | "error"
        | undefined,
    },
  };

  // Filter out undefined values for deep merge
  const cleanedConfig = JSON.parse(
    JSON.stringify(envConfig, (key, value) => {
      if (value === undefined) {
        return undefined;
      }
      // Preserve empty objects so Zod object defaults can be applied.
      return value;
    })
  );

  // Validate and merge with defaults
  const config = GramCreditConfigSchema.parse(cleanedConfig);

  // Ensure weights sum to 1
  const weightSum =
    config.fusion.weights.voice +
    config.fusion.weights.socialGraph +
    config.fusion.weights.satellite +
    config.fusion.weights.behavior;

  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(
      `Signal weights must sum to 1.0, got ${weightSum}. Current: voice=${config.fusion.weights.voice}, social=${config.fusion.weights.socialGraph}, satellite=${config.fusion.weights.satellite}, behavior=${config.fusion.weights.behavior}`
    );
  }

  return config;
}

// ========== Export Singleton ==========

let cachedConfig: GramCreditConfig | null = null;

/**
 * Get GramCredit configuration (cached after first load)
 */
export function getGramCreditConfig(): GramCreditConfig {
  if (!cachedConfig) {
    cachedConfig = loadGramCreditConfig();
  }
  return cachedConfig;
}

/**
 * Reset config (for testing)
 */
export function resetGramCreditConfig(): void {
  cachedConfig = null;
}
