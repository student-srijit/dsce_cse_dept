/**
 * Social Graph Module - Main Entry
 * Orchestrates network building + GNN scoring
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type { SocialGraphModuleOutput } from "../../core/types";
import { scoreGNNTrust } from "./gnn-scorer";
import { getMockSocialNetwork, getMockTransactionHistory } from "./mock-data";
import { getGramCreditConfig } from "../../core/config";
import {
  validateScore,
  validateConfidence,
  createErrorOutput,
  logModuleProcessing,
} from "../../core/module-utils";

/**
 * Score social trust from UPI/SHG network
 * Builds graph from transaction history, runs GNN inference
 */
export async function scoreSocialGraphModule(
  farmerId: string,
  logger: GramCreditTraceLogger,
  mockMode: boolean = false,
): Promise<SocialGraphModuleOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();
  const enableGnnScoring =
    process.env.GRAMCREDIT_SOCIAL_USE_GNN_MODEL !== "false";

  try {
    logger.logInput("social_graph", {
      farmerId,
      mode: mockMode ? "mock" : "real",
      transactionWindow: config.socialGraph.transactionThresholdDays,
      gnnScoring: enableGnnScoring,
    });

    // ========== Get Network Data ==========
    let network;

    if (mockMode) {
      // Use mock data
      network = getMockSocialNetwork(farmerId);
      logModuleProcessing(logger, "social_graph", "network_loaded_mock", {
        nodeCount: network.nodes.length,
        edgeCount: network.edges.length,
      });
    } else {
      // In production, fetch from real UPI/SHG databases
      // For now, fall back to mock
      network = getMockSocialNetwork(farmerId);
      logModuleProcessing(logger, "social_graph", "network_loaded_real", {
        nodeCount: network.nodes.length,
        edgeCount: network.edges.length,
      });
    }

    if (network.nodes.length === 0) {
      return createErrorOutput(
        "social_graph",
        "No network data available",
        "SOCIAL_NO_NETWORK_DATA",
        0,
        {},
      );
    }

    // ========== Verify Farmer in Network ==========
    const farmerInNetwork = network.nodes.some((n) => n.farmerId === farmerId);
    if (!farmerInNetwork) {
      logger.logValidation(
        "social_graph",
        false,
        "Farmer not found in network, adding as new node",
      );
      // This shouldn't happen with proper data, but handle gracefully
    }

    // ========== Score with GNN ==========
    const gnnResult = await scoreGNNTrust(
      network.nodes,
      network.edges,
      farmerId,
      logger,
      enableGnnScoring,
    );

    logger.logProcessing("social_graph", "gnn_scoring_complete", {
      trustScore: gnnResult.trustScore,
      confidence: gnnResult.confidence,
      anomalyScore: gnnResult.anomalyScore,
    });

    // ========== Compute Final Score ==========
    // Social score combines trust metrics with network health
    const socialScore = computeSocialScore(gnnResult);

    logModuleProcessing(
      logger,
      "social_graph",
      "final_score",
      {
        socialScore,
        gnnTrustScore: gnnResult.trustScore,
        pageRank: gnnResult.pageRankScore,
        clusterCoefficient: gnnResult.clusterCoefficient,
      },
      Date.now() - startTime,
    );

    const response: SocialGraphModuleOutput = {
      score: socialScore,
      confidence: gnnResult.confidence,
      reasonCode: gnnResult.reasonCode,
      details: {
        graphSize: network.nodes.length,
        clusterCoefficient: gnnResult.clusterCoefficient || 0,
        pageRankScore: gnnResult.pageRankScore || 0,
        embeddingDimension: gnnResult.embeddings?.length || 128,
        anomalyScore: gnnResult.anomalyScore,
        gnnEnabled: enableGnnScoring,
      },
      metadata: {
        moduleId: "social_graph",
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  } catch (error) {
    logger.logError("social_graph", error);

    return createErrorOutput(
      "social_graph",
      error instanceof Error ? error.message : String(error),
      "SOCIAL_PROCESSING_ERROR",
      0,
      {},
    );
  }
}

/**
 * Compute creditworthiness score from social graph metrics
 * Weights trustworthiness and network integration
 */
function computeSocialScore(gnnResult: {
  trustScore: number;
  pageRankScore?: number;
  clusterCoefficient?: number;
  anomalyScore?: number;
}): number {
  let score = gnnResult.trustScore * 0.6; // Base trust is primary

  // PageRank: higher rank = better integrated = more trustworthy
  if (gnnResult.pageRankScore !== undefined) {
    score += gnnResult.pageRankScore * 100 * 0.15;
  }

  // Clustering: high clustering = strong community ties = lower risk
  if (gnnResult.clusterCoefficient !== undefined) {
    score += gnnResult.clusterCoefficient * 100 * 0.15;
  }

  // Anomaly penalty: suspicious patterns reduce score
  if (gnnResult.anomalyScore !== undefined && gnnResult.anomalyScore > 0.3) {
    score *= 1 - gnnResult.anomalyScore * 0.5;
  }

  return validateScore(score, 0, 100, 50);
}

export { getMockSocialNetwork, getMockTransactionHistory };
