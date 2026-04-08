/**
 * Social Graph Engine - GNN Scorer
 * Uses a lightweight message-passing GNN style inference over trust networks
 * Falls back to graph metric-based scoring if graph inference fails
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type { SocialGraphNode, SocialGraphEdge } from "../../core/types";
import {
  normalizeMinMax,
  validateScore,
  validateConfidence,
  logModuleProcessing,
  logModuleError,
} from "../../core/module-utils";
import {
  SOCIAL_GNN_MODEL_V1,
  type GraphSageModelWeights,
} from "./model/gnn-trained-weights";

export interface GNNScoringResult {
  trustScore: number; // 0-100
  confidence: number; // 0-1
  embeddings?: number[]; // GNN embedding vector
  pageRankScore?: number; // 0-1
  clusterCoefficient?: number; // 0-1
  anomalyScore?: number; // 0-1, higher = suspicious
  reasonCode: string;
}

/**
 * Score social trust using GNN + graph metrics
 * Returns trust score based on network position and transaction patterns
 */
export async function scoreGNNTrust(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  targetFarmerId: string,
  logger: GramCreditTraceLogger,
  useModel: boolean = false,
): Promise<GNNScoringResult> {
  const startTime = Date.now();

  try {
    logger.logInput("social_gnn_scorer", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      targetFarmerId,
      modelUsage: useModel,
    });

    if (nodes.length === 0) {
      return {
        trustScore: 0,
        confidence: 0,
        anomalyScore: 1,
        reasonCode: "SOCIAL_NO_NETWORK_DATA",
      };
    }

    // ========== Build Graph Metrics ==========
    const graphMetrics = computeGraphMetrics(nodes, edges, targetFarmerId);

    logModuleProcessing(logger, "social_gnn_scorer", "graph_metrics_computed", {
      metrics: graphMetrics,
    });

    // ========== GNN Scoring (Model or Fallback) ==========
    let trustScore: number;
    let confidence: number;
    let embedding: number[] | undefined;
    let anomalyScore: number;

    if (useModel) {
      try {
        const result = await scoreWithGNNModel(
          nodes,
          edges,
          targetFarmerId,
          logger,
        );
        trustScore = result.trustScore;
        confidence = result.confidence;
        embedding = result.embedding;
        anomalyScore = result.anomalyScore || graphMetrics.anomalyScore;
      } catch (error) {
        logger.logProcessing("social_gnn_scorer", "model_fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall back to metric-based scoring
        const result = scoreWithMetrics(graphMetrics);
        trustScore = result.trustScore;
        confidence = result.confidence;
        anomalyScore = graphMetrics.anomalyScore;
      }
    } else {
      // Use metric-based scoring directly
      const result = scoreWithMetrics(graphMetrics);
      trustScore = result.trustScore;
      confidence = result.confidence;
      anomalyScore = graphMetrics.anomalyScore;
    }

    const reasonCode = generateReasonCode(
      trustScore,
      graphMetrics,
      anomalyScore,
    );

    logModuleProcessing(
      logger,
      "social_gnn_scorer",
      "scoring_complete",
      {
        trustScore,
        confidence,
        anomalyScore,
        reasonCode,
      },
      Date.now() - startTime,
    );

    return {
      trustScore,
      confidence,
      embeddings: embedding,
      pageRankScore: graphMetrics.pageRankScore,
      clusterCoefficient: graphMetrics.clusterCoefficient,
      anomalyScore,
      reasonCode,
    };
  } catch (error) {
    logModuleError(logger, "social_gnn_scorer", error);
    throw error;
  }
}

// ========== Graph Metrics Computation ==========

interface GraphMetrics {
  pageRankScore: number; // 0-1
  clusterCoefficient: number; // 0-1
  degreeCentrality: number; // 0-1
  transactionVolumeNorm: number; // 0-100
  repaymentReliability: number; // 0-100
  networkDensity: number; // 0-1
  anomalyScore: number; // 0-1
}

function computeGraphMetrics(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  targetFarmerId: string,
): GraphMetrics {
  // Find target node
  const targetIdx = nodes.findIndex((n) => n.farmerId === targetFarmerId);
  if (targetIdx === -1) {
    return {
      pageRankScore: 0,
      clusterCoefficient: 0,
      degreeCentrality: 0,
      transactionVolumeNorm: 0,
      repaymentReliability: 0,
      networkDensity: 0,
      anomalyScore: 1,
    };
  }

  const targetNode = nodes[targetIdx];

  // ========== PageRank Score ==========
  const pageRankScore = computePageRank(nodes, edges, targetIdx);

  // ========== Clustering Coefficient ==========
  const clusterCoefficient = computeClusteringCoefficient(
    nodes,
    edges,
    targetIdx,
  );

  // ========== Degree Centrality ==========
  const targetEdges = edges.filter(
    (e) => e.source === targetFarmerId || e.target === targetFarmerId,
  );
  const degreeCentrality = Math.min(1, targetEdges.length / (nodes.length - 1));

  // ========== Transaction Volume (normalized) ==========
  const transactionVolumeNorm = normalizeMinMax(
    targetNode.transactionVolume,
    50000,
    500000,
  ); // 50k-500k range

  // ========== Repayment Reliability ==========
  const repaymentMetrics = targetNode.repaymentHistory;
  const totalPayments =
    repaymentMetrics.onTimePayments +
    repaymentMetrics.latePayments +
    repaymentMetrics.defaultedPayments;

  let repaymentReliability = 50; // baseline
  if (totalPayments > 0) {
    const defaultRatio = repaymentMetrics.defaultedPayments / totalPayments;
    const lateRatio = repaymentMetrics.latePayments / totalPayments;
    const reliabilityScore =
      (repaymentMetrics.onTimePayments / totalPayments) * 100 -
      defaultRatio * 50 -
      lateRatio * 10;
    repaymentReliability = Math.max(0, Math.min(100, reliabilityScore));
  }

  // ========== Network Density ==========
  const maxEdges = (nodes.length * (nodes.length - 1)) / 2;
  const networkDensity = edges.length / Math.max(1, maxEdges);

  // ========== Anomaly Score ==========
  // High anomaly if: isolated, low repayment history, suspicious patterns
  let anomalyScore = 0;

  if (degreeCentrality < 0.1) {
    anomalyScore += 0.3; // Isolated from network
  }

  if (repaymentMetrics.defaultedPayments > 0) {
    anomalyScore += 0.3; // Past defaults
  }

  if (repaymentMetrics.defaultedPayments > repaymentMetrics.onTimePayments) {
    anomalyScore += 0.4; // More defaults than successes
  }

  anomalyScore = Math.min(1, anomalyScore);

  return {
    pageRankScore: Math.min(1, pageRankScore * 5), // Scale to 0-1
    clusterCoefficient,
    degreeCentrality,
    transactionVolumeNorm,
    repaymentReliability,
    networkDensity,
    anomalyScore,
  };
}

/**
 * Compute PageRank for a node using power iteration
 */
function computePageRank(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  targetIdx: number,
  iterations: number = 10,
): number {
  const n = nodes.length;
  let scores = Array(n).fill(1 / n);
  const damping = 0.85;

  // Build adjacency from edges
  const adj = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (const edge of edges) {
    const sourceIdx = nodes.findIndex((n) => n.farmerId === edge.source);
    const targetIdxEdge = nodes.findIndex((n) => n.farmerId === edge.target);

    if (sourceIdx >= 0 && targetIdxEdge >= 0) {
      adj[sourceIdx][targetIdxEdge] += edge.weight;
      adj[targetIdxEdge][sourceIdx] += edge.weight;
    }
  }

  // Power iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = Array(n).fill((1 - damping) / n);

    for (let i = 0; i < n; i++) {
      const outSum = adj[i].reduce((a, b) => a + b, 0);
      if (outSum > 0) {
        for (let j = 0; j < n; j++) {
          if (adj[i][j] > 0) {
            newScores[j] += (damping * scores[i] * adj[i][j]) / outSum;
          }
        }
      }
    }

    scores = newScores;
  }

  return scores[targetIdx] || 0;
}

/**
 * Compute clustering coefficient for target node
 */
function computeClusteringCoefficient(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  targetIdx: number,
): number {
  const targetFarmerId = nodes[targetIdx].farmerId;

  // Find neighbors
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (edge.source === targetFarmerId) {
      neighbors.add(edge.target);
    } else if (edge.target === targetFarmerId) {
      neighbors.add(edge.source);
    }
  }

  if (neighbors.size < 2) {
    return 0;
  }

  // Count edges between neighbors
  let triangles = 0;
  const neighborArray = Array.from(neighbors);

  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const edge = edges.find(
        (e) =>
          (e.source === neighborArray[i] && e.target === neighborArray[j]) ||
          (e.source === neighborArray[j] && e.target === neighborArray[i]),
      );
      if (edge) {
        triangles++;
      }
    }
  }

  const maxPossibleEdges = (neighbors.size * (neighbors.size - 1)) / 2;
  return maxPossibleEdges > 0 ? triangles / maxPossibleEdges : 0;
}

// ========== GNN Message-Passing Scoring ==========

/**
 * Score with a full GraphSAGE-style neural forward pass.
 * Weight tensors are loaded from exported model parameters.
 */
async function scoreWithGNNModel(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  targetFarmerId: string,
  logger: GramCreditTraceLogger,
): Promise<{
  trustScore: number;
  confidence: number;
  embedding: number[];
  anomalyScore: number;
}> {
  const model = SOCIAL_GNN_MODEL_V1;
  validateModelShape(model);

  const nodeIndexById = new Map<string, number>();
  nodes.forEach((node, idx) => {
    nodeIndexById.set(node.farmerId, idx);
  });

  const targetIdx = nodeIndexById.get(targetFarmerId);
  if (targetIdx === undefined) {
    throw new Error(
      `Target farmer ${targetFarmerId} not found in social graph`,
    );
  }

  const adjacency = buildAdjacency(nodes, edges, nodeIndexById);
  const baseFeatures = buildNodeFeatures(nodes, adjacency, model);

  const layer1 = runGraphSageLayer(
    baseFeatures,
    adjacency,
    model.selfWeight1,
    model.neighWeight1,
    model.bias1,
  );

  const layer2 = runGraphSageLayer(
    layer1,
    adjacency,
    model.selfWeight2,
    model.neighWeight2,
    model.bias2,
  );

  const targetEmbedding = layer2[targetIdx] || Array(model.hiddenDim).fill(0);
  const targetNode = nodes[targetIdx];
  const targetNeighbors = adjacency[targetIdx] || [];
  const neighborCount = targetNeighbors.length;
  const weightedDegree = targetNeighbors.reduce((sum, n) => sum + n.weight, 0);

  const paymentTotal =
    targetNode.repaymentHistory.onTimePayments +
    targetNode.repaymentHistory.latePayments +
    targetNode.repaymentHistory.defaultedPayments;
  const onTimeRatio =
    paymentTotal > 0
      ? targetNode.repaymentHistory.onTimePayments / paymentTotal
      : 0;
  const defaultRatio =
    paymentTotal > 0
      ? targetNode.repaymentHistory.defaultedPayments / paymentTotal
      : 0;

  const neuralLogit =
    dot(targetEmbedding, model.readoutWeight) + model.readoutBias;
  const neuralScore = sigmoid(neuralLogit) * 100;

  const anomalyScore = validateConfidence(
    defaultRatio * 0.55 +
      Math.max(0, 0.2 - onTimeRatio) * 0.6 +
      (neighborCount === 0 ? 0.3 : 0) +
      (weightedDegree < 0.8 ? 0.15 : 0),
    0.5,
  );

  const trustScore = validateScore(neuralScore - anomalyScore * 18, 0, 100, 50);

  const confidence = validateConfidence(
    0.5 +
      Math.min(0.2, neighborCount * 0.03) +
      Math.min(0.12, Math.abs(neuralLogit) * 0.05) +
      Math.min(0.08, edges.length / Math.max(1, nodes.length * 10)) +
      (1 - anomalyScore) * 0.1,
  );

  logger.logProcessing("social_gnn_scorer", "neural_forward_pass", {
    modelVersion: model.modelVersion,
    inputDim: model.inputDim,
    hiddenDim: model.hiddenDim,
    outputDim: model.outputDim,
    targetFarmerId,
    trustScore,
    confidence,
    anomalyScore,
  });

  return {
    trustScore,
    confidence,
    embedding: targetEmbedding.map((v) => Number(v.toFixed(6))),
    anomalyScore,
  };
}

interface AdjacentNode {
  nodeIdx: number;
  weight: number;
}

function buildAdjacency(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[],
  nodeIndexById: Map<string, number>,
): AdjacentNode[][] {
  const adjacency: AdjacentNode[][] = Array.from(
    { length: nodes.length },
    () => [],
  );

  for (const edge of edges) {
    const sourceIdx = nodeIndexById.get(edge.source);
    const targetIdx = nodeIndexById.get(edge.target);
    if (
      sourceIdx === undefined ||
      targetIdx === undefined ||
      sourceIdx === targetIdx
    ) {
      continue;
    }

    const edgeWeight = Math.max(
      0.05,
      edge.weight * 0.7 + Math.min(1, edge.frequency / 20) * 0.3,
    );

    adjacency[sourceIdx].push({ nodeIdx: targetIdx, weight: edgeWeight });
    adjacency[targetIdx].push({ nodeIdx: sourceIdx, weight: edgeWeight });
  }

  return adjacency;
}

function buildNodeFeatures(
  nodes: SocialGraphNode[],
  adjacency: AdjacentNode[][],
  model: GraphSageModelWeights,
): number[][] {
  if (model.inputDim !== 8) {
    throw new Error(
      `Unsupported model inputDim ${model.inputDim}. Expected 8 features.`,
    );
  }

  const volumes = nodes.map((node) => node.transactionVolume);
  const frequencies = nodes.map((node) => node.transactionFrequency);
  const weightedDegrees = adjacency.map((neighbors) =>
    neighbors.reduce((sum, n) => sum + n.weight, 0),
  );

  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);
  const minFrequency = Math.min(...frequencies);
  const maxFrequency = Math.max(...frequencies);
  const minWeightedDegree = Math.min(...weightedDegrees, 0);
  const maxWeightedDegree = Math.max(...weightedDegrees, 1);

  return nodes.map((node, idx) => {
    const payments = node.repaymentHistory;
    const totalPayments =
      payments.onTimePayments +
      payments.latePayments +
      payments.defaultedPayments;

    const onTimeRatio =
      totalPayments > 0 ? payments.onTimePayments / totalPayments : 0;
    const lateRatio =
      totalPayments > 0 ? payments.latePayments / totalPayments : 0;
    const defaultRatio =
      totalPayments > 0 ? payments.defaultedPayments / totalPayments : 0;
    const repaymentDensity = Math.min(1, totalPayments / 24);
    const degreeCentrality = Math.min(
      1,
      adjacency[idx].length / Math.max(1, nodes.length - 1),
    );
    const weightedDegreeNorm =
      normalizeMinMax(
        weightedDegrees[idx],
        minWeightedDegree,
        maxWeightedDegree,
      ) / 100;

    return [
      normalizeMinMax(node.transactionVolume, minVolume, maxVolume) / 100,
      normalizeMinMax(node.transactionFrequency, minFrequency, maxFrequency) /
        100,
      onTimeRatio,
      lateRatio,
      defaultRatio,
      repaymentDensity,
      degreeCentrality,
      weightedDegreeNorm,
    ];
  });
}

function runGraphSageLayer(
  features: number[][],
  adjacency: AdjacentNode[][],
  selfWeight: number[][],
  neighWeight: number[][],
  bias: number[],
): number[][] {
  return features.map((selfFeature, idx) => {
    const neighborMean = buildNeighborMean(features, adjacency[idx]);
    const selfProjected = matmulVector(selfFeature, selfWeight);
    const neighborProjected = matmulVector(neighborMean, neighWeight);

    const summed = selfProjected.map(
      (value, colIdx) =>
        value + neighborProjected[colIdx] + (bias[colIdx] || 0),
    );

    return reluVector(summed);
  });
}

function buildNeighborMean(
  features: number[][],
  neighbors: AdjacentNode[],
): number[] {
  const dim = features[0]?.length || 0;
  if (neighbors.length === 0) {
    return new Array(dim).fill(0);
  }

  const acc = new Array(dim).fill(0);
  let totalWeight = 0;

  for (const neighbor of neighbors) {
    const vector = features[neighbor.nodeIdx];
    totalWeight += neighbor.weight;
    for (let i = 0; i < dim; i++) {
      acc[i] += (vector?.[i] || 0) * neighbor.weight;
    }
  }

  if (totalWeight <= 0) {
    return new Array(dim).fill(0);
  }

  return acc.map((v) => v / totalWeight);
}

function matmulVector(vector: number[], matrix: number[][]): number[] {
  if (matrix.length === 0) {
    return [];
  }

  const outputDim = matrix[0].length;
  const out = new Array(outputDim).fill(0);

  for (let row = 0; row < matrix.length; row++) {
    const value = vector[row] || 0;
    const weights = matrix[row] || [];
    for (let col = 0; col < outputDim; col++) {
      out[col] += value * (weights[col] || 0);
    }
  }

  return out;
}

function reluVector(vector: number[]): number[] {
  return vector.map((v) => Math.max(0, v));
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function dot(a: number[], b: number[]): number {
  const size = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    sum += (a[i] || 0) * (b[i] || 0);
  }
  return sum;
}

function validateModelShape(model: GraphSageModelWeights): void {
  if (model.readoutWeight.length !== model.hiddenDim) {
    throw new Error(
      `Invalid GNN model: readout length ${model.readoutWeight.length} != hiddenDim ${model.hiddenDim}`,
    );
  }

  if (
    model.selfWeight1.length !== model.inputDim ||
    model.neighWeight1.length !== model.inputDim
  ) {
    throw new Error("Invalid GNN model: layer1 input dimensions mismatch");
  }

  if (
    model.selfWeight2.length !== model.hiddenDim ||
    model.neighWeight2.length !== model.hiddenDim
  ) {
    throw new Error("Invalid GNN model: layer2 input dimensions mismatch");
  }
}

// ========== Metric-Based Scoring ==========

function scoreWithMetrics(metrics: GraphMetrics): {
  trustScore: number;
  confidence: number;
} {
  // Weighted combination of graph metrics
  const trustScore =
    metrics.pageRankScore * 0.25 +
    metrics.clusterCoefficient * 0.15 +
    metrics.degreeCentrality * 0.2 +
    (metrics.transactionVolumeNorm / 100) * 0.15 +
    (metrics.repaymentReliability / 100) * 0.25 -
    metrics.anomalyScore * 20;

  const normalizedTrust = normalizeMinMax(trustScore, -20, 1.2); // Scale to 0-100

  // Confidence based on network density and data availability
  let confidence = 0.5 + metrics.networkDensity * 0.3;
  confidence = validateConfidence(confidence);

  return {
    trustScore: validateScore(normalizedTrust),
    confidence,
  };
}

// ========== Reason Code Generation ==========

function generateReasonCode(
  trustScore: number,
  metrics: GraphMetrics,
  anomalyScore: number,
): string {
  if (anomalyScore > 0.6) {
    return "SOCIAL_FRAUD_INDICATORS";
  }

  if (trustScore >= 70) {
    return "SOCIAL_STRONG_NETWORK";
  } else if (trustScore >= 50) {
    return "SOCIAL_MODERATE_NETWORK";
  } else {
    return "SOCIAL_WEAK_NETWORK";
  }
}
