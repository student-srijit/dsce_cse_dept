/**
 * Satellite Crop Scorer Module
 * Analyzes crop health using Sentinel-2 NDVI data
 * Implements fraud detection via NDVI anomalies
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type { SatelliteModuleOutput, CropHealthMetrics } from "../../core/types";
import { getGramCreditConfig } from "../../core/config";
import {
  validateScore,
  validateConfidence,
  createErrorOutput,
  simpleAnomalyScore,
  normalizeMinMax,
  logModuleProcessing,
} from "../../core/module-utils";

export interface SatelliteData {
  ndvi: number; // -1 to 1
  cloudCover: number; // 0-100
  imageDate: string; // ISO date
  source: "sentinel" | "bhuvan";
}

/**
 * Score crop health from satellite imagery
 */
export async function scoreSatelliteCropModule(
  location: { latitude: number; longitude: number },
  cropType: string,
  plantedDate?: string,
  logger?: GramCreditTraceLogger,
  mockMode: boolean = false
): Promise<SatelliteModuleOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();
  const moduleLogger = logger || createDefaultLogger();

  try {
    moduleLogger.logInput("satellite_crop", {
      location,
      cropType,
      plantedDate,
      provider: config.satellite.defaultProvider,
    });

    // ========== Fetch Satellite Data ==========
    if (mockMode) {
      throw new Error(
        "Satellite mock mode is disabled. Configure a real satellite provider.",
      );
    }

    const satelliteData = await fetchSatelliteData(
      location,
      cropType,
      config.satellite.defaultProvider
    );

    moduleLogger.logProcessing("satellite_crop", "data_fetched", {
      source: satelliteData.source,
      ndvi: satelliteData.ndvi,
      cloudCover: satelliteData.cloudCover,
      imageDate: satelliteData.imageDate,
    });

    // ========== Validate Cloud Cover ==========
    if (satelliteData.cloudCover > 70) {
      moduleLogger.logValidation(
        "satellite_crop",
        false,
        `High cloud cover (${satelliteData.cloudCover}%), NDVI may be unreliable`
      );
    }

    // ========== Assess Planting Stage ==========
    let plantingStage = "mature";
    if (plantedDate) {
      const plantDate = new Date(plantedDate);
      const daysSincePlanting = Math.floor(
        (Date.now() - plantDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSincePlanting < 30) {
        plantingStage = "germination";
      } else if (daysSincePlanting < 90) {
        plantingStage = "vegetative";
      } else if (daysSincePlanting < 150) {
        plantingStage = "flowering";
      }
    }

    // ========== Compute NDVI Health Score ==========
    const ndviCategory = getHealthCategory(satelliteData.ndvi, config.satellite.ndviHealthThreshold);

    // Normalize NDVI to 0-100 health score
    // NDVI typically ranges -1 (water/dead) to +1 (healthy vegetation)
    const healthScore = normalizeMinMax(
      satelliteData.ndvi,
      -1,
      1
    );

    // ========== Detect Fraud Anomalies ==========
    // Compare to regional baseline
    const regionalBaseline = getRegionalBaseline(
      cropType,
      plantingStage
    );

    const anomalyScore = simpleAnomalyScore(
      [regionalBaseline, 0.5], // Use baseline and neutral as reference
      satelliteData.ndvi,
      config.satellite.anomalyDetectionSensitivity
    );

    const fraudConfidence = anomalyScore > 0.6 ? anomalyScore : 0;

    moduleLogger.logProcessing("satellite_crop", "health_analysis", {
      ndvi: satelliteData.ndvi,
      healthCategory: ndviCategory,
      healthScore,
      regionalBaseline,
      anomalyScore,
      fraudConfidence,
    });

    // ========== Compute Confidence ==========
    let confidence = 0.7;

    if (plantingStage === "germination") {
      confidence -= 0.2; // Too early to assess
    }

    if (satelliteData.cloudCover > 30) {
      confidence -= 0.1 * (satelliteData.cloudCover / 100);
    }

    confidence = validateConfidence(confidence);

    // ========== Generate Reason Code ==========
    const reasonCode = generateReasonCode(ndviCategory, anomalyScore);

    moduleLogger.logProcessing(
      "satellite_crop",
      "final_score",
      {
        healthScore,
        confidence,
        reasonCode,
      },
      Date.now() - startTime
    );

    const cropHealthMetrics: CropHealthMetrics = {
      ndvi: satelliteData.ndvi,
      ndviZscore: (satelliteData.ndvi - regionalBaseline) / 0.2, // Approx std dev
      ndviCategory,
      regionalBaseline,
      imageDate: satelliteData.imageDate,
      cloudCover: satelliteData.cloudCover,
      anomalyScore,
      fraudConfidence,
    };

    const response: SatelliteModuleOutput = {
      score: healthScore,
      confidence,
      reasonCode,
      details: cropHealthMetrics,
      metadata: {
        moduleId: "satellite_crop",
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  } catch (error) {
    moduleLogger.logError("satellite_crop", error, {
      location,
      cropType,
    });

    return createErrorOutput(
      "satellite_crop",
      error instanceof Error ? error.message : String(error),
      "SATELLITE_PROCESSING_ERROR",
      0,
      {}
    );
  }
}

// ========== Sentinel-2 / ISRO Bhuvan Fetchers ==========

/**
 * Fetch satellite data from Sentinel-2 or ISRO Bhuvan
 */
async function fetchSatelliteData(
  location: { latitude: number; longitude: number },
  cropType: string,
  provider: "sentinel" | "bhuvan",
): Promise<SatelliteData> {
  if (provider === "sentinel") {
    return fetchSentinel2Data(location, cropType);
  }

  return fetchBhuvanData(location, cropType);
}

/**
 * Fetch from Sentinel-2 via Sentinel Hub API
 */
async function fetchSentinel2Data(location: {
  latitude: number;
  longitude: number;
}, cropType: string): Promise<SatelliteData> {
  const config = getGramCreditConfig();

  if (!config.satellite.connectorUrl) {
    throw new Error(
      "GRAMCREDIT_SATELLITE_CONNECTOR_URL is required when using sentinel provider.",
    );
  }

  return fetchSatelliteFromConnector(
    config.satellite.connectorUrl,
    config.satellite.connectorApiKey,
    location,
    cropType,
    "sentinel",
  );
}

/**
 * Fetch from ISRO Bhuvan API
 */
async function fetchBhuvanData(location: {
  latitude: number;
  longitude: number;
}, cropType: string): Promise<SatelliteData> {
  const config = getGramCreditConfig();

  if (!config.satellite.connectorUrl) {
    throw new Error(
      "GRAMCREDIT_SATELLITE_CONNECTOR_URL is required when using bhuvan provider.",
    );
  }

  return fetchSatelliteFromConnector(
    config.satellite.connectorUrl,
    config.satellite.connectorApiKey,
    location,
    cropType,
    "bhuvan",
  );
}

async function fetchSatelliteFromConnector(
  connectorUrl: string,
  connectorApiKey: string | undefined,
  location: { latitude: number; longitude: number },
  cropType: string,
  provider: "sentinel" | "bhuvan",
): Promise<SatelliteData> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (connectorApiKey) {
    headers["x-api-key"] = connectorApiKey;
  }

  const response = await fetch(connectorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider,
      cropType,
      location,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Satellite connector request failed (${response.status}): ${responseText.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  return parseSatelliteData(payload, provider);
}

function parseSatelliteData(
  payload: unknown,
  expectedProvider: "sentinel" | "bhuvan",
): SatelliteData {
  if (!payload || typeof payload !== "object") {
    throw new Error("Satellite connector response must be a JSON object.");
  }

  const source = payload as {
    ndvi?: unknown;
    cloudCover?: unknown;
    imageDate?: unknown;
    source?: unknown;
  };

  const connectorSource = source.source;
  if (connectorSource !== expectedProvider) {
    throw new Error(
      `Satellite connector source mismatch: expected '${expectedProvider}', got '${String(connectorSource)}'.`,
    );
  }

  return {
    ndvi: parseFiniteNumber(source.ndvi, "satellite.ndvi"),
    cloudCover: parseFiniteNumber(source.cloudCover, "satellite.cloudCover"),
    imageDate: parseIsoDate(source.imageDate, "satellite.imageDate"),
    source: expectedProvider,
  };
}

function parseFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${fieldName}: expected finite number.`);
  }
  return value;
}

function parseIsoDate(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: expected non-empty ISO date string.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: invalid date value.`);
  }

  return value;
}

// ========== Crop Baselines ==========

/**
 * Get regional NDVI baseline for crop type and growth stage
 */
function getRegionalBaseline(
  cropType: string,
  stage: string
): number {
  const baselines: Record<string, Record<string, number>> = {
    wheat: {
      germination: 0.1,
      vegetative: 0.4,
      flowering: 0.65,
      mature: 0.6,
    },
    rice: {
      germination: 0.15,
      vegetative: 0.45,
      flowering: 0.7,
      mature: 0.65,
    },
    cotton: {
      germination: 0.08,
      vegetative: 0.35,
      flowering: 0.6,
      mature: 0.55,
    },
    maize: {
      germination: 0.12,
      vegetative: 0.42,
      flowering: 0.68,
      mature: 0.62,
    },
    sugarcane: {
      germination: 0.2,
      vegetative: 0.5,
      flowering: 0.75,
      mature: 0.72,
    },
  };

  return (
    baselines[cropType.toLowerCase()]?.[stage] || 0.5
  );
}

/**
 * Classify NDVI into health categories
 */
function getHealthCategory(
  ndvi: number,
  thresholds: { healthy: number; struggling: number; critical: number }
): "HEALTHY" | "STRESSED" | "CRITICAL" | "UNKNOWN" | "RECENTLY_PLANTED" {
  if (ndvi < -0.1) {
    return "UNKNOWN"; // Water or non-vegetation
  } else if (ndvi < thresholds.critical) {
    return "CRITICAL";
  } else if (ndvi < thresholds.struggling) {
    return "STRESSED";
  } else if (ndvi < thresholds.healthy) {
    return "STRESSED"; // Below healthy threshold
  } else {
    return "HEALTHY";
  }
}

/**
 * Generate reason code based on crop health
 */
function generateReasonCode(
  ndviCategory: string,
  anomalyScore: number
): string {
  if (anomalyScore > 0.6) {
    return "SATELLITE_FRAUD_ALERT";
  }

  switch (ndviCategory) {
    case "HEALTHY":
      return "SATELLITE_HEALTHY_CROP";
    case "STRESSED":
      return "SATELLITE_CROP_STRESS";
    case "CRITICAL":
      return "SATELLITE_CROP_CRITICAL";
    case "RECENTLY_PLANTED":
      return "SATELLITE_RECENT_PLANTING";
    default:
      return "SATELLITE_UNKNOWN_HEALTH";
  }
}

/**
 * Dummy logger for when none provided
 */
function createDefaultLogger(): GramCreditTraceLogger {
  const { createTraceLogger } = require("../../core/trace-logger");
  return createTraceLogger("dummy", "dummy");
}

export type { CropHealthMetrics };
