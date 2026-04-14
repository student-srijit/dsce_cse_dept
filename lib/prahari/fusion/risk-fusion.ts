import { clamp, weightedAverage } from "../core/scoring";
import type {
  PrahariModuleOutput,
  PrahariRiskFusionDetails,
  PrahariModuleId,
} from "../core/types";

type InputMap = Record<
  "transfraud" | "ghostnet" | "deepshield" | "biosentinel" | "fedshield",
  PrahariModuleOutput<Record<string, number>>
>;

export function fusePrahariRisk(
  inputs: InputMap,
): PrahariModuleOutput<PrahariRiskFusionDetails> {
  const start = Date.now();

  const weights: Record<PrahariModuleId, number> = {
    transfraud: 0.28,
    ghostnet: 0.24,
    deepshield: 0.2,
    biosentinel: 0.16,
    fedshield: 0.12,
    risk_fusion: 1,
  };

  const scoreValues = [
    inputs.transfraud.riskScore,
    inputs.ghostnet.riskScore,
    inputs.deepshield.riskScore,
    inputs.biosentinel.riskScore,
    inputs.fedshield.riskScore,
  ];
  const confidenceValues = [
    inputs.transfraud.confidence,
    inputs.ghostnet.confidence,
    inputs.deepshield.confidence,
    inputs.biosentinel.confidence,
    inputs.fedshield.confidence,
  ];
  const moduleWeights = [
    weights.transfraud,
    weights.ghostnet,
    weights.deepshield,
    weights.biosentinel,
    weights.fedshield,
  ];

  const weightedScore = weightedAverage(scoreValues, moduleWeights, 0);
  const confidence = clamp(weightedAverage(confidenceValues, moduleWeights, 0.2), 0.2, 0.99);

  const reasonCodes: string[] = [];
  if (inputs.transfraud.riskScore > 70) reasonCodes.push("FUSION_TRANSFRAUD_DOMINANT");
  if (inputs.ghostnet.riskScore > 70) reasonCodes.push("FUSION_GHOSTNET_DOMINANT");
  if (inputs.deepshield.riskScore > 70) reasonCodes.push("FUSION_DEEPSHIELD_DOMINANT");
  if (inputs.biosentinel.riskScore > 70) reasonCodes.push("FUSION_BIOSENTINEL_DOMINANT");
  if (inputs.fedshield.riskScore > 70) reasonCodes.push("FUSION_FEDSHIELD_DOMINANT");
  if (reasonCodes.length === 0) reasonCodes.push("FUSION_BALANCED_RISK_SIGNAL");

  return {
    riskScore: weightedScore,
    confidence,
    reasonCodes,
    details: {
      moduleScores: {
        transfraud: inputs.transfraud.riskScore,
        ghostnet: inputs.ghostnet.riskScore,
        deepshield: inputs.deepshield.riskScore,
        biosentinel: inputs.biosentinel.riskScore,
        fedshield: inputs.fedshield.riskScore,
        risk_fusion: weightedScore,
      },
      moduleConfidences: {
        transfraud: inputs.transfraud.confidence,
        ghostnet: inputs.ghostnet.confidence,
        deepshield: inputs.deepshield.confidence,
        biosentinel: inputs.biosentinel.confidence,
        fedshield: inputs.fedshield.confidence,
        risk_fusion: confidence,
      },
      weightedScore,
    },
    metadata: {
      moduleId: "risk_fusion",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
