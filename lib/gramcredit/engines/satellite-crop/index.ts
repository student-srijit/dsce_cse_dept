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
  source: "sentinel" | "bhuvan" | "mock";
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
    let satelliteData: SatelliteData;

    if (mockMode) {
      satelliteData = generateMockSatelliteData(cropType);
    } else {
      try {
        satelliteData = await fetchSatelliteData(
          location,
          cropType,
          config.satellite.defaultProvider
        );
      } catch (error) {
        moduleLogger.logProcessing("satellite_crop", "fetch_failed_fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall back to mock data
        satelliteData = generateMockSatelliteData(cropType);
        satelliteData.source = "mock";
      }
    }

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
      50, // Neutral score on error
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
  provider: "sentinel" | "bhuvan" | "mock"
): Promise<SatelliteData> {
  if (provider === "sentinel") {
    return fetchSentinel2Data(location);
  } else if (provider === "bhuvan") {
    return fetchBhuvanData(location);
  } else {
    return generateMockSatelliteData(cropType);
  }
}

/**
 * Fetch from Sentinel-2 via Sentinel Hub API
 */
async function fetchSentinel2Data(location: {
  latitude: number;
  longitude: number;
}): Promise<SatelliteData> {
  const config = getGramCreditConfig();

  if (
    !config.satellite.sentinelHubClientId ||
    !config.satellite.sentinelHubSecret
  ) {
    throw new Error("Sentinel Hub credentials not configured");
  }

  // TODO: Implement actual Sentinel Hub API call
  // For now, return mock
  return generateMockSatelliteData("wheat");
}

/**
 * Fetch from ISRO Bhuvan API
 */
async function fetchBhuvanData(location: {
  latitude: number;
  longitude: number;
}): Promise<SatelliteData> {
  const config = getGramCreditConfig();

  if (!config.satellite.bhuvanApiKey) {
    throw new Error("Bhuvan API key not configured");
  }

  // TODO: Implement actual Bhuvan API call
  // ISRO Bhuvan NDVI products: https://bhuvan-nrsc.gov.in
  // For now, return mock
  return generateMockSatelliteData("wheat");
}

// ========== Mock Data & Baselines ==========

/**
 * Generate realistic mock satellite data
 */
function generateMockSatelliteData(cropType: string): SatelliteData {
  // Realistic NDVI ranges by crop type
  const ndviRanges: Record<string, [number, number]> = {
    wheat: [0.4, 0.75],
    rice: [0.5, 0.8],
    cotton: [0.35, 0.7],
    maize: [0.45, 0.75],
    sugarcane: [0.55, 0.8],
  };

  const [minNdvi, maxNdvi] = ndviRanges[cropType.toLowerCase()] || [0.4, 0.75];

  return {
    ndvi: minNdvi + Math.random() * (maxNdvi - minNdvi),
    cloudCover: Math.random() * 30, // Assume good weather
    imageDate: new Date().toISOString().split("T")[0],
    source: "mock",
  };
}

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
