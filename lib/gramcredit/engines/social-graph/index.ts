/**
 * Social Graph Module - Main Entry
 * Orchestrates network building + GNN scoring
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type {
  SocialGraphModuleOutput,
  SocialGraphNode,
  SocialGraphEdge,
} from "../../core/types";
import { scoreGNNTrust } from "./gnn-scorer";
import { getGramCreditConfig } from "../../core/config";
import {
  validateScore,
  createErrorOutput,
  logModuleProcessing,
} from "../../core/module-utils";

interface SocialNetworkData {
  nodes: SocialGraphNode[];
  edges: SocialGraphEdge[];
}

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
    if (mockMode) {
      throw new Error(
        "Social graph mock mode is disabled. Provide a real UPI/SHG data source.",
      );
    }

    const network = await fetchRealSocialGraphNetwork(
      farmerId,
      config.socialGraph.transactionThresholdDays,
    );

    logModuleProcessing(logger, "social_graph", "network_loaded_real", {
      nodeCount: network.nodes.length,
      edgeCount: network.edges.length,
    });

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

async function fetchRealSocialGraphNetwork(
  farmerId: string,
  transactionWindowDays: number,
): Promise<SocialNetworkData> {
  const config = getGramCreditConfig();
  const connectorUrl = config.socialGraph.connectorUrl;

  if (!connectorUrl) {
    throw new Error(
      "GRAMCREDIT_SOCIAL_CONNECTOR_URL is required for real social graph scoring.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.socialGraph.connectorApiKey) {
    headers["x-api-key"] = config.socialGraph.connectorApiKey;
  }

  const response = await fetch(connectorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      farmerId,
      transactionWindowDays,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Social connector request failed (${response.status}): ${responseText.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  return parseSocialNetworkData(payload);
}

function parseSocialNetworkData(payload: unknown): SocialNetworkData {
  if (!payload || typeof payload !== "object") {
    throw new Error("Social connector response must be a JSON object.");
  }

  const nodesRaw = (payload as { nodes?: unknown }).nodes;
  const edgesRaw = (payload as { edges?: unknown }).edges;

  if (!Array.isArray(nodesRaw)) {
    throw new Error("Social connector response missing 'nodes' array.");
  }
  if (!Array.isArray(edgesRaw)) {
    throw new Error("Social connector response missing 'edges' array.");
  }

  return {
    nodes: nodesRaw.map(parseSocialNode),
    edges: edgesRaw.map(parseSocialEdge),
  };
}

function parseSocialNode(node: unknown): SocialGraphNode {
  if (!node || typeof node !== "object") {
    throw new Error("Invalid social node: expected object.");
  }

  const source = node as {
    farmerId?: unknown;
    transactionVolume?: unknown;
    transactionFrequency?: unknown;
    repaymentHistory?: {
      onTimePayments?: unknown;
      latePayments?: unknown;
      defaultedPayments?: unknown;
    };
  };

  const farmerId = asNonEmptyString(source.farmerId, "node.farmerId");
  const transactionVolume = asFiniteNumber(
    source.transactionVolume,
    "node.transactionVolume",
  );
  const transactionFrequency = asFiniteNumber(
    source.transactionFrequency,
    "node.transactionFrequency",
  );

  if (!source.repaymentHistory || typeof source.repaymentHistory !== "object") {
    throw new Error("Invalid social node: missing repaymentHistory.");
  }

  return {
    farmerId,
    transactionVolume,
    transactionFrequency,
    repaymentHistory: {
      onTimePayments: asFiniteNumber(
        source.repaymentHistory.onTimePayments,
        "node.repaymentHistory.onTimePayments",
      ),
      latePayments: asFiniteNumber(
        source.repaymentHistory.latePayments,
        "node.repaymentHistory.latePayments",
      ),
      defaultedPayments: asFiniteNumber(
        source.repaymentHistory.defaultedPayments,
        "node.repaymentHistory.defaultedPayments",
      ),
    },
  };
}

function parseSocialEdge(edge: unknown): SocialGraphEdge {
  if (!edge || typeof edge !== "object") {
    throw new Error("Invalid social edge: expected object.");
  }

  const source = edge as {
    source?: unknown;
    target?: unknown;
    weight?: unknown;
    frequency?: unknown;
  };

  return {
    source: asNonEmptyString(source.source, "edge.source"),
    target: asNonEmptyString(source.target, "edge.target"),
    weight: asFiniteNumber(source.weight, "edge.weight"),
    frequency: asFiniteNumber(source.frequency, "edge.frequency"),
  };
}

function asNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: expected non-empty string.`);
  }
  return value.trim();
}

function asFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${fieldName}: expected finite number.`);
  }
  return value;
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

