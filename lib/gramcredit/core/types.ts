/**
 * GramCredit Core Type Definitions
 * All modules return ScoredOutput<T> with structured confidence and reason codes
 */

// ========== Shared Module Output Structure ==========
export interface ScoredOutput<T = Record<string, any>> {
  score: number; // 0-100 normalized score
  confidence: number; // 0-1, model certainty
  reasonCode: string; // e.g., "VOICE_HIGH_TRUSTWORTHINESS"
  details: T; // Module-specific data
  metadata: {
    moduleId: string;
    timestamp: number;
    processingTimeMs: number;
  };
}

// ========== Trace Logging ==========
export type TraceEventType =
  | "INPUT"
  | "PROCESSING"
  | "OUTPUT"
  | "ERROR"
  | "VALIDATION";

export interface TraceEvent {
  moduleId: string;
  eventType: TraceEventType;
  timestamp: number;
  data: Record<string, any>;
  duration?: number;
  errorMessage?: string;
}

export interface FullTrace {
  applicantId: string;
  applicationId: string;
  timestamp: number;
  events: TraceEvent[];
  finalDecision: {
    gramScore: number;
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    attributions: FeatureAttribution[];
    explanation: Record<string, string>; // { 'en': '...', 'hi': '...', etc }
  };
  requestMetadata: {
    ip?: string;
    userAgent?: string;
  };
}

// ========== Voice Psychometric Module ==========
export interface OceanTraits {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  transcriptSnippet?: string;
  speechQualityScore?: number; // 0-100 for audio clarity
}

export interface VoiceModuleOutput extends ScoredOutput<OceanTraits> {
  moduleId: "voice_psychometric";
}

// ========== Social Graph Module ==========
export interface SocialGraphNode {
  farmerId: string;
  transactionVolume: number; // INR
  transactionFrequency: number; // count
  repaymentHistory: {
    onTimePayments: number;
    latePayments: number;
    defaultedPayments: number;
  };
}

export interface SocialGraphEdge {
  source: string;
  target: string;
  weight: number; // transaction trust score
  frequency: number; // interaction count
}

export interface TrustGraphMetrics {
  graphSize: number;
  clusterCoefficient: number; // 0-1
  pageRankScore: number; // 0-1
  embeddingDimension?: number;
  anomalyScore?: number; // 0-1, higher = more suspicious
}

export interface SocialGraphModuleOutput extends ScoredOutput<TrustGraphMetrics> {
  moduleId: "social_graph";
}

// ========== Satellite Crop Module ==========
export interface CropHealthMetrics {
  ndvi: number; // -1 to 1
  ndviZscore: number; // standardized NDVI vs region
  ndviCategory:
    | "HEALTHY"
    | "STRESSED"
    | "CRITICAL"
    | "UNKNOWN"
    | "RECENTLY_PLANTED";
  regionalBaseline: number; // expected NDVI for crop type
  imageDate: string; // ISO date of latest satellite image
  cloudCover: number; // 0-100%
  anomalyScore?: number; // 0-1, higher = fraud risk
  fraudConfidence?: number; // 0-1
}

export interface SatelliteModuleOutput extends ScoredOutput<CropHealthMetrics> {
  moduleId: "satellite_crop";
}

// ========== Behavior Signal Module ==========
export interface BehaviorMetrics {
  upiTransactionCount: number;
  upiFrequencyRegularity: number; // 0-100 consistency score
  upiAverageAmountTrend: "increasing" | "stable" | "decreasing";
  rechargeFrequencyDays: number;
  rechargeConsistency: number; // 0-100
  inactivityAlerts: number; // count of gaps > threshold
  anomalyDetected: boolean;
}

export interface BehaviorModuleOutput extends ScoredOutput<BehaviorMetrics> {
  moduleId: "behavior_signal";
}

// ========== GramScore & Decision Engines ==========
export interface SignalWeights {
  voice: number;
  socialGraph: number;
  satellite: number;
  behavior: number;
}

export interface GramScoreDetails {
  voiceScore: number;
  socialScore: number;
  satelliteScore: number;
  behaviorScore: number;
  weights: SignalWeights;
  signalConfidences: {
    voice: number;
    socialGraph: number;
    satellite: number;
    behavior: number;
  };
}

export interface GramScoreOutput extends ScoredOutput<GramScoreDetails> {
  moduleId: "gram_score_engine";
}

export interface DecisionOutput {
  decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  gramScore: number;
  approvedAmount: number; // INR, 0 if rejected
  loanCategory: "MICRO" | "MINI" | "STANDARD" | "NONE";
  reasonCodes: string[]; // decision-level reason codes
  eligibilityFailures?: string[]; // if rejected, why
}

// ========== Disbursement Engine ==========
export interface RepaymentInstallment {
  installmentNumber: number;
  dueDate: string; // ISO date
  dueAmount: number; // INR
  principal: number;
  interest: number;
}

export interface DisbursementDetails {
  loanAmount: number; // INR
  disbursementDate: string;
  tenureMonths: number;
  interestRateAnnual: number; // e.g., 14 for 14% p.a.
  monthlyPayment: number;
  totalPayable: number;
  repaymentSchedule: RepaymentInstallment[];
  repaymentFrequency: "weekly" | "bi-weekly" | "monthly";
  latePaymentPenalty: number; // % of installment
}

// ========== Feature Attribution (SHAP-style) ==========
export interface FeatureAttribution {
  signalId: "voice" | "social" | "satellite" | "behavior";
  signalName: string;
  contribution: number; // change in final score
  percentageOfTotal: number; // % of 100
  confidence: number; // 0-1
  direction: "positive" | "negative" | "neutral";
  reasonCode: string;
  baselineValue?: number; // median signal score
  actualValue?: number; // farmer's signal score
}

// ========== Application Context ==========
export interface FarmerProfile {
  farmerId: string;
  name: string;
  age: number;
  location: {
    latitude: number;
    longitude: number;
    village?: string;
    state?: string;
  };
  cropType: string;
  landSizeAcres: number;
  mobileNumber?: string;
  preferredLanguage: "en" | "hi" | "ta" | "te" | "kn";
}

export interface LoanRequest {
  amount: number; // INR
  tenureMonths?: number; // optional, can be overridden by engine
  purpose?: string;
  cropCycle?: "kharif" | "rabi" | "zaid";
}

export interface ApplicationRequest {
  farmerId: string;
  farmerProfile: FarmerProfile;
  loanRequest: LoanRequest;
  audioBlob?: string; // base64 encoded WAV/WebM
  audioUrl?: string; // alternative: pre-recorded URL
  metadata?: {
    deviceId?: string;
    timestamp?: number;
    ipAddress?: string;
  };
}

export interface ApplicationResponse {
  applicationId: string;
  farmerId: string;
  timestamp: number;
  decision: DecisionOutput;
  gramScore: {
    score: number;
    confidence: number;
    signals: {
      voice: number;
      social: number;
      satellite: number;
      behavior: number;
    };
  };
  disbursement: DisbursementDetails | null; // null if rejected
  attributions: FeatureAttribution[];
  explanation: Record<string, string>; // multilingual
  traceId: string;
}

// ========== Config Types (exported, validated at runtime) ==========
export interface GramCreditConfig {
  voice: {
    modelId: string;
    groqModel: string;
    oceanScaleRange: [number, number];
    requiredConfidence: number;
    interviewLanguage: string;
    maxAudioDuration: number; // seconds
  };
  socialGraph: {
    gnnModelPath: string;
    transactionThresholdDays: number;
    minClusterSize: number;
    trustNormalization: "minmax" | "zscore";
  };
  satellite: {
    sentinelHubClientId?: string;
    sentinelHubSecret?: string;
    bhuvanApiKey?: string;
    ndviHealthThreshold: {
      healthy: number;
      struggling: number;
      critical: number;
    };
    anomalyDetectionSensitivity: number;
    defaultProvider: "sentinel" | "bhuvan" | "mock";
    imageSearchWindowDays: number;
  };
  behavior: {
    consistencyWindowDays: number;
    minTransactionsRequired: number;
    rechargeRegularityWeight: number;
    transactionFrequencyWeight: number;
    anomalyThreshold: number;
  };
  fusion: {
    weights: SignalWeights;
    normalizationMethod: "minmax" | "zscore";
    nonlinearTransform?: {
      type: "sigmoid" | "relu";
      steepness?: number;
    };
  };
  decision: {
    approvalThresholds: {
      micro: number;
      mini: number;
      standard: number;
    };
    minimumConfidence: number;
    eligibilityFilters: {
      minAge: number;
      maxAge: number;
      minPastLoans: number;
    };
  };
  disbursement: {
    loanBands: Array<{
      scoreMin: number;
      scoreMax: number;
      maxAmount: number; // INR
      tenure: number; // months
      interestRate: number; // % p.a.
    }>;
    repaymentSchedule: "weekly" | "bi-weekly" | "monthly";
    latePaymentPenalty: number; // % of installment
  };
  logging: {
    enableTraces: boolean;
    persistToDatabase: boolean;
    databaseUrl?: string;
    logLevel: "debug" | "info" | "warn" | "error";
  };
}
