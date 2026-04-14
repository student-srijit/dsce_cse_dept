import { clamp, toPercent, weightedAverage } from "../../core/scoring";
import type {
  FaceLivenessSignals,
  KycDocumentSignals,
  PrahariModuleOutput,
} from "../../core/types";

export function scoreDeepShield(
  docSignals: KycDocumentSignals,
  faceSignals: FaceLivenessSignals,
): PrahariModuleOutput<Record<string, number>> {
  const start = Date.now();

  const docAuthenticity = weightedAverage(
    [
      docSignals.fontConsistency,
      docSignals.pixelNoiseIntegrity,
      docSignals.qrMatchScore,
      docSignals.microPrintIntegrity,
      docSignals.laminateReflectionScore,
    ],
    [0.18, 0.18, 0.24, 0.22, 0.18],
    0,
  );

  const identityConsistency = clamp(docSignals.nameMatchScore, 0, 1);

  const faceAuthenticity = weightedAverage(
    [
      faceSignals.blinkConsistency,
      faceSignals.textureAuthenticity,
      1 - clamp(faceSignals.frequencyArtifactRisk, 0, 1),
    ],
    [0.3, 0.35, 0.35],
    0,
  );

  const overallAuthenticity = weightedAverage(
    [docAuthenticity, identityConsistency, faceAuthenticity],
    [0.4, 0.22, 0.38],
    0,
  );

  const risk01 = clamp(1 - overallAuthenticity, 0, 1);
  const confidence = clamp(
    weightedAverage([docAuthenticity, faceAuthenticity], [0.55, 0.45], 0.4),
    0.35,
    0.99,
  );

  const reasonCodes: string[] = [];
  if (docAuthenticity < 0.55) reasonCodes.push("DEEPSHIELD_DOCUMENT_TAMPER_RISK");
  if (faceSignals.frequencyArtifactRisk > 0.45)
    reasonCodes.push("DEEPSHIELD_FACE_ARTIFACT_DETECTED");
  if (identityConsistency < 0.6) reasonCodes.push("DEEPSHIELD_CROSS_MODAL_MISMATCH");
  if (reasonCodes.length === 0) reasonCodes.push("DEEPSHIELD_LOW_KYC_RISK");

  return {
    riskScore: toPercent(risk01),
    confidence,
    reasonCodes,
    details: {
      docAuthenticity,
      identityConsistency,
      faceAuthenticity,
      overallAuthenticity,
      frequencyArtifactRisk: clamp(faceSignals.frequencyArtifactRisk, 0, 1),
    },
    metadata: {
      moduleId: "deepshield",
      timestamp: Date.now(),
      processingTimeMs: Date.now() - start,
      version: "1.0.0",
    },
  };
}
