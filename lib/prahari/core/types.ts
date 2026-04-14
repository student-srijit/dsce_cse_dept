export type PrahariModuleId =
  | "transfraud"
  | "ghostnet"
  | "deepshield"
  | "biosentinel"
  | "fedshield"
  | "risk_fusion";

export interface PrahariModuleMetadata {
  moduleId: PrahariModuleId;
  timestamp: number;
  processingTimeMs: number;
  version: string;
}

export interface PrahariModuleOutput<TDetails> {
  riskScore: number; // 0-100 where 100 is highest risk
  confidence: number; // 0-1
  reasonCodes: string[];
  details: TDetails;
  metadata: PrahariModuleMetadata;
}

export interface UpiTransactionEvent {
  id: string;
  userId: string;
  merchantId: string;
  amount: number;
  hourOfDay: number; // 0-23
  geoCluster: string;
  deviceHash: string;
  upiHandle: string;
}

export interface UpiUserFeature {
  userId: string;
  transactionCount30d: number;
  averageAmount: number;
  velocitySpikeRatio: number;
  knownFraudLinks: number;
}

export interface BeneficiaryRecord {
  beneficiaryId: string;
  aadhaarHash: string;
  bankAccountHash: string;
  addressHash: string;
  mobileHash: string;
  schemeId: string;
  enrollmentTimestamp: number;
  dormantBeforePayout: boolean;
  biometricFailureCount: number;
}

export interface KycDocumentSignals {
  fontConsistency: number; // 0-1
  pixelNoiseIntegrity: number; // 0-1
  qrMatchScore: number; // 0-1
  microPrintIntegrity: number; // 0-1
  laminateReflectionScore: number; // 0-1
  nameMatchScore: number; // 0-1
}

export interface FaceLivenessSignals {
  blinkConsistency: number; // 0-1
  textureAuthenticity: number; // 0-1
  frequencyArtifactRisk: number; // 0-1 where high means suspicious
}

export interface BehaviorSession {
  userId: string;
  averageTouchPressure: number;
  averageSwipeVelocity: number;
  averageInterKeyIntervalMs: number;
  accelerometerVariance: number;
  pacingSecondsBetweenActions: number;
}

export interface FederatedClientMetrics {
  clientId: string;
  localAuc: number; // 0-1
  gradientNorm: number;
  sampleCount: number;
  suspiciousUpdate: boolean;
}

export interface PrahariRiskFusionDetails {
  moduleScores: Record<PrahariModuleId, number>;
  moduleConfidences: Record<PrahariModuleId, number>;
  weightedScore: number;
}

export interface PrahariPipelineInput {
  transactionSequence: UpiTransactionEvent[];
  userFeatures: UpiUserFeature[];
  beneficiaryRecords: BeneficiaryRecord[];
  kycSignals: KycDocumentSignals;
  faceSignals: FaceLivenessSignals;
  baselineBehavior: BehaviorSession[];
  currentBehavior: BehaviorSession;
  federatedClients: FederatedClientMetrics[];
}

export interface PrahariPipelineOutput {
  transFraud: PrahariModuleOutput<Record<string, number>>;
  ghostNet: PrahariModuleOutput<Record<string, number>>;
  deepShield: PrahariModuleOutput<Record<string, number>>;
  bioSentinel: PrahariModuleOutput<Record<string, number>>;
  fedShield: PrahariModuleOutput<Record<string, number>>;
  fused: PrahariModuleOutput<PrahariRiskFusionDetails>;
}
