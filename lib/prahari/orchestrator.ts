import { scoreBioSentinel } from "./engines/biosentinel";
import { scoreDeepShield } from "./engines/deepshield";
import { scoreFedShield } from "./engines/fedshield";
import { scoreGhostNet } from "./engines/ghostnet";
import { scoreTransFraud } from "./engines/transfraud";
import { fusePrahariRisk } from "./fusion/risk-fusion";
import type { PrahariPipelineInput, PrahariPipelineOutput } from "./core/types";

export function runPrahariRiskPipeline(
  input: PrahariPipelineInput,
): PrahariPipelineOutput {
  const transFraud = scoreTransFraud(input.transactionSequence, input.userFeatures);
  const ghostNet = scoreGhostNet(input.beneficiaryRecords);
  const deepShield = scoreDeepShield(input.kycSignals, input.faceSignals);
  const bioSentinel = scoreBioSentinel(input.baselineBehavior, input.currentBehavior);
  const fedShield = scoreFedShield(input.federatedClients);

  const fused = fusePrahariRisk({
    transfraud: transFraud,
    ghostnet: ghostNet,
    deepshield: deepShield,
    biosentinel: bioSentinel,
    fedshield: fedShield,
  });

  return {
    transFraud,
    ghostNet,
    deepShield,
    bioSentinel,
    fedShield,
    fused,
  };
}
