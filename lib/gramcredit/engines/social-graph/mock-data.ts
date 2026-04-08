/**
 * Social Graph Engine - Mock UPI & SHG Data
 * Generates realistic test data for social trust network
 */

import type {
  SocialGraphNode,
  SocialGraphEdge,
} from "../../core/types";

export interface SocialNetworkData {
  nodes: SocialGraphNode[];
  edges: SocialGraphEdge[];
  adjacencyMatrix: number[][];
}

/**
 * Generate mock UPI transaction graph for a farmer
 * Includes: peer transactions, SHG group members, local merchant interactions
 */
export function generateMockSocialNetwork(
  farmerId: string,
  networkSize: number = 15
): SocialNetworkData {
  // Farmer node
  const farmerNode: SocialGraphNode = {
    farmerId,
    transactionVolume: 150000 + Math.random() * 100000, // ₹1.5-2.5L typical range
    transactionFrequency: 25 + Math.random() * 15, // 25-40 transactions/month
    repaymentHistory: {
      onTimePayments: 18 + Math.floor(Math.random() * 6),
      latePayments: 1 + Math.floor(Math.random() * 3),
      defaultedPayments: Math.random() > 0.8 ? 1 : 0,
    },
  };

  const nodes: SocialGraphNode[] = [farmerNode];

  // Generate network peers (SHG members, local merchants, etc.)
  for (let i = 0; i < networkSize - 1; i++) {
    const peerId = `PEER_${farmerId}_${i}`;
    nodes.push({
      farmerId: peerId,
      transactionVolume: 50000 + Math.random() * 200000,
      transactionFrequency: 10 + Math.random() * 30,
      repaymentHistory: {
        onTimePayments: Math.floor(Math.random() * 20),
        latePayments: Math.floor(Math.random() * 3),
        defaultedPayments: Math.random() > 0.85 ? Math.floor(Math.random() * 2) : 0,
      },
    });
  }

  // Generate edges (transactions between farmer and peers)
  const edges: SocialGraphEdge[] = [];

  // Farmer has strong connections to ~5-8 key peers
  const strongPeerCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 1; i <= strongPeerCount; i++) {
    edges.push({
      source: farmerId,
      target: nodes[i].farmerId,
      weight: 0.6 + Math.random() * 0.4, // 0.6-1.0 trust
      frequency: 8 + Math.floor(Math.random() * 12), // Monthly interactions
    });
  }

  // Weaker connections to remaining peers
  for (let i = strongPeerCount + 1; i < nodes.length; i++) {
    if (Math.random() > 0.4) {
      // 60% probability of any edge
      edges.push({
        source: farmerId,
        target: nodes[i].farmerId,
        weight: 0.2 + Math.random() * 0.4, // 0.2-0.6 trust
        frequency: 1 + Math.floor(Math.random() * 4), // Occasional interactions
      });
    }
  }

  // Add some peer-to-peer transactions (SHG internal)
  for (let i = 1; i < Math.min(5, nodes.length); i++) {
    for (let j = i + 1; j < Math.min(i + 3, nodes.length); j++) {
      if (Math.random() > 0.5) {
        edges.push({
          source: nodes[i].farmerId,
          target: nodes[j].farmerId,
          weight: 0.3 + Math.random() * 0.5,
          frequency: 2 + Math.floor(Math.random() * 6),
        });
      }
    }
  }

  // Build adjacency matrix (normalized transaction volume as edge weights)
  const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);

  return {
    nodes,
    edges,
    adjacencyMatrix,
  };
}

/**
 * Build adjacency matrix from nodes and edges
 * Uses transaction volume as edge weights
 */
function buildAdjacencyMatrix(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[]
): number[][] {
  const n = nodes.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  // Create node index map
  const nodeIndexMap = new Map(
    nodes.map((node, idx) => [node.farmerId, idx])
  );

  // Populate edges
  for (const edge of edges) {
    const sourceIdx = nodeIndexMap.get(edge.source);
    const targetIdx = nodeIndexMap.get(edge.target);

    if (sourceIdx !== undefined && targetIdx !== undefined) {
      // Normalize edge weight by transaction frequency
      const normalizedWeight = (edge.weight * edge.frequency) / 10;
      matrix[sourceIdx][targetIdx] = normalizedWeight;
      matrix[targetIdx][sourceIdx] = normalizedWeight; // Symmetric for undirected graph
    }
  }

  return matrix;
}

/**
 * Get mock network for specific farmer (cached for consistency)
 */
const mockNetworkCache = new Map<string, SocialNetworkData>();

export function getMockSocialNetwork(
  farmerId: string,
  networkSize?: number
): SocialNetworkData {
  if (!mockNetworkCache.has(farmerId)) {
    mockNetworkCache.set(farmerId, generateMockSocialNetwork(farmerId, networkSize));
  }
  return mockNetworkCache.get(farmerId)!;
}

/**
 * Clear mock data cache (for testing)
 */
export function clearMockNetworkCache(): void {
  mockNetworkCache.clear();
}

/**
 * Get mock transaction history for farmer
 * Returns last N transactions
 */
export interface MockTransaction {
  date: Date;
  counterparty: string;
  amount: number; // INR
  type: "credit" | "debit";
  status: "completed" | "pending" | "failed";
}

export function getMockTransactionHistory(
  farmerId: string,
  days: number = 90
): MockTransaction[] {
  const transactions: MockTransaction[] = [];
  const now = new Date();
  const network = getMockSocialNetwork(farmerId);

  // Generate ~10-30 transactions over the period
  const txCount = 10 + Math.floor(Math.random() * 20);

  for (let i = 0; i < txCount; i++) {
    const daysAgo = Math.floor(Math.random() * days);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // Pick random peer from network
    const peer = network.nodes[1 + Math.floor(Math.random() * (network.nodes.length - 1))];

    transactions.push({
      date,
      counterparty: peer.farmerId,
      amount: 500 + Math.floor(Math.random() * 5000),
      type: Math.random() > 0.5 ? "credit" : "debit",
      status: Math.random() > 0.05 ? "completed" : "pending",
    });
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Calculate graph metrics from network data
 */
export function calculateGraphMetrics(network: SocialNetworkData): {
  clusterCoefficient: number;
  pageRankScores: number[];
  degreeCentrality: number[];
} {
  const n = network.nodes.length;
  const adj = network.adjacencyMatrix;

  // Simple clustering coefficient (transitivity)
  let triangles = 0;
  let connectedTriples = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (adj[i][j] > 0) {
        for (let k = j + 1; k < n; k++) {
          if (adj[j][k] > 0 && adj[i][k] > 0) {
            triangles++;
          }
          if ((adj[i][j] > 0 || adj[i][k] > 0) && (adj[j][k] > 0)) {
            connectedTriples++;
          }
        }
      }
    }
  }

  const clusterCoefficient =
    connectedTriples > 0 ? triangles / connectedTriples : 0;

  // Simple PageRank (power iteration, 10 iterations)
  let ranks = Array(n).fill(1 / n);
  const damping = 0.85;

  for (let iter = 0; iter < 10; iter++) {
    const newRanks = Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      const outDegree = adj[i].reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0);
      if (outDegree > 0) {
        for (let j = 0; j < n; j++) {
          if (adj[i][j] > 0) {
            newRanks[j] += (damping * ranks[i]) / outDegree;
          }
        }
      }
    }
    ranks = newRanks;
  }

  // Normalize PageRank to 0-1
  const maxRank = Math.max(...ranks);
  const normalizedPageRank = ranks.map((r) => r / (maxRank || 1));

  // Degree centrality
  const degreeCentrality = adj.map((row) => {
    const connections = row.filter((val) => val > 0).length;
    return connections / (n - 1); // Normalize by max possible
  });

  return {
    clusterCoefficient: Math.min(1, clusterCoefficient),
    pageRankScores: normalizedPageRank,
    degreeCentrality,
  };
}
