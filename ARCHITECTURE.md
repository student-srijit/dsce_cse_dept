# GramCredit System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Farmer     │  │    Voice     │  │  Decision + Explain  │   │
│  │   Profile    │→ │  Recorder    │→ │      Display         │   │
│  │   Form       │  │  (Web Audio) │  │   (SHAP visual)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         ↓                  ↓                      ↑               │
│         └──────────────────┼──────────────────────┘               │
│                            │                                     │
│                    POST /api/gramcredit/apply                    │
│                            │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │      API Route Handler (Next.js)          │
        │   (/app/api/gramcredit/apply/route.ts)    │
        │                                           │
        │  • Request validation (Zod)              │
        │  • Audio blob conversion                 │
        │  • Call orchestrator                     │
        │  • Error handling                        │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────▼──────────────────────────────┐
        │        ORCHESTRATOR PIPELINE                       │
        │   (lib/gramcredit/orchestrator.ts)                │
        │                                                   │
        │  1. Input Validation                             │
        │  2. Parallel Signal Scoring (Promise.allSettled) │
        │  3. Fusion → GramScore                           │
        │  4. Decision Engine                              │
        │  5. Disbursement Calculation                     │
        │  6. SHAP Attribution + Explanations              │
        │  7. Trace Logging                                │
        └────┬────────────────┬────────────────┬────────────┘
             │                │                │
       ┌─────▼────┐      ┌────▼────┐      ┌───▼────┐
       │ Signal 1 │      │ Signal 2 │      │Signal 3│   (Signal 4 below)
       │ PARALLEL │      │PARALLEL  │      │PARALLEL│
       └──────────┘      └──────────┘      └────────┘
             │                │                │
        ┌────▼────────────┐   │          ┌────▼────────────┐
        │   VOICE ENGINE  │   │          │ SATELLITE ENGINE│
        │                 │   │          │                 │
        │ • Whisper STT   │   │          │ • Sentinel-2    │
        │ • Groq OCEAN    │   │          │ • NDVI Analysis │
        │ • Trait Scoring │   │          │ • Fraud Detection
        │                 │   │          │ • Health Score  │
        │  Score: 0-100   │   │          │  Score: 0-100   │
        │ Conf: 0-1       │   │          │ Conf: 0-1       │
        └─────────────────┘   │          └─────────────────┘
                              │
        ┌─────────────────┐   │    ┌──────────────────┐
        │  SOCIAL GRAPH   │◄──┘    │BEHAVIOR SIGNAL   │
        │     ENGINE      │        │     ENGINE       │
        │                 │        │                  │
        │ • UPI Networks  │        │ • Transaction    │
        │ • GNN Scoring   │        │   Frequency      │
        │ • Fraud Check   │        │ • Recharge       │
        │ • Trust Score   │        │   Regularity     │
        │  Score: 0-100   │        │ • Time-series    │
        │ Conf: 0-1       │        │   Analysis       │
        └──────┬──────────┘        │  Score: 0-100    │
               │                   │ Conf: 0-1        │
               └────────┬──────────┘                  │
                        │          ┌──────────────────┘
                        │          │
        ┌───────────────▼──────────▼───────────────────┐
        │      GRAM SCORE FUSION ENGINE                │
        │ (lib/gramcredit/fusion/gram-score-engine)    │
        │                                              │
        │  Weighted Sum:                              │
        │  GramScore = 0.25×Voice + 0.30×Social +     │
        │              0.30×Satellite + 0.15×Behavior │
        │                                              │
        │  Output: GramScore (0-100) + Breakdown      │
        └──────────────┬─────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  DECISION ENGINE            │
        │  (/fusion/decision-engine)  │
        │                             │
        │  • Eligibility checks       │
        │  • Approval thresholds      │
        │  • Loan category selection  │
        │  • Rejection reasoning      │
        │                             │
        │  Output:                    │
        │  Decision + Reason Code     │
        │  Approved Amount (or null)  │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼────────────────────┐
        │ DISBURSEMENT ENGINE            │
        │ (/fusion/disbursement-engine)  │
        │                                │
        │ If APPROVED:                  │
        │  • Select loan band           │
        │  • Calculate interest rate    │
        │  • Compute EMI                │
        │  • Generate repayment schedule│
        │                                │
        │ Output:                        │
        │ DisbursementDetails (or null) │
        └──────────┬─────────────────────┘
                   │
        ┌──────────▼──────────────────────┐
        │    EXPLAINABILITY LAYER         │
        │                                 │
        │ ┌─────────────────────────────┐ │
        │ │ SHAP Attributor             │ │
        │ │ (shap-attributor.ts)        │ │
        │ │                             │ │
        │ │ • Marginal contributions    │ │
        │ │ • Feature directions        │ │
        │ │ • Attribution ranking       │ │
        │ │ • Top-N drivers             │ │
        │ └────────────┬────────────────┘ │
        │              │                  │
        │ ┌────────────▼────────────────┐ │
        │ │ i18n Explainer              │ │
        │ │ (i18n-explainer.ts)         │ │
        │ │                             │ │
        │ │ Languages:                  │ │
        │ │  • English (en)             │ │
        │ │  • हिंदी (hi)               │ │
        │ │  • தமிழ் (ta)               │ │
        │ │  • తెలుగు (te)               │ │
        │ │  • ಕನ್ನಡ (kn)               │ │
        │ │                             │ │
        │ │ Contexts:                   │ │
        │ │  • APPROVED_STANDARD        │ │
        │ │  • APPROVED_MINI            │ │
        │ │  • APPROVED_MICRO           │ │
        │ │  • REJECTED                 │ │
        │ │  • UNDER_REVIEW             │ │
        │ └────────────┬────────────────┘ │
        │              │                  │
        │         Output:                 │
        │    Explanations (5 languages)  │
        │    + SHAP Attributions         │
        └──────────┬──────────────────────┘
                   │
        ┌──────────▼──────────────────────┐
        │  TRACE LOGGER                   │
        │  (core/trace-logger.ts)         │
        │                                 │
        │ Events:                         │
        │  • INPUT: Data received        │
        │  • PROCESSING: Step progress   │
        │  • OUTPUT: Results generated   │
        │  • ERROR: Failures             │
        │  • VALIDATION: Rules applied   │
        │                                 │
        │ Outputs:                        │
        │  • Console (dev)                │
        │  • PostgreSQL (production)      │
        │  • JSON trace object (response) │
        └──────────┬──────────────────────┘
                   │
        ┌──────────▼──────────────────────┐
        │   RESPONSE OBJECT                │
        │  (API route returns to frontend) │
        │                                 │
        │  {                              │
        │    decision: {...},             │
        │    gramScore: {...},            │
        │    disbursement: {...},         │
        │    explanation: {...},          │
        │    attributions: [...],         │
        │    trace: {...}                 │
        │  }                              │
        └──────────┬──────────────────────┘
                   │
        └──────────▼──────────────────────┐
                 FRONTEND                 │
             Display Results               │
           (DecisionCard +              │
          ExplanationCard)              │
                                         │
         └─────────────────────────────┘
```

---

## Data Flow: Step-by-Step

### 1. User Provides Input
```
Farmer Profile Form
├─ Name, Age, State
├─ Location (GPS)
├─ Crop Type
├─ Land Size
└─ Preferred Language
      ↓
Voice Recorder (Web Audio API)
├─ Record 30-60 seconds
├─ Capture as Blob
└─ Encode to Base64
```

### 2. Orchestrator Receives Request
```
POST /api/gramcredit/apply
{
  farmerId: "farmer_123"
  audioBlob: "<base64>"
  farmerProfile: {...}
  requestedLoanAmount: 50000
}
  ↓
Validation
├─ Required fields present
├─ Audio blob valid
├─ Profile complete
└─ Zod schema validation
```

### 3. Parallel Signal Scoring

**Signal 1: Voice Psychometric**
```
Input: audioBlob
  ├→ Whisper API: STT transcription
  │   └─ Returns: transcript text + confidence
  ├→ Groq LLM: OCEAN trait extraction
  │   ├─ Input prompt: transcript + interview context
  │   └─ Output: O, C, E, A, N scores (0-100)
  ├→ Creditworthiness calculation
  │   └─ Score = 0.4×C + 0.25×A + 0.2×(100-N)
  └→ Output: VoiceModuleOutput
Output: {score: 0-100, confidence: 0-1, ...}
```

**Signal 2: Social Graph**
```
Input: farmerId
  ├→ Load mock UPI network
  ├→ Fetch SHG membership
  ├→ Compute graph metrics
  │   ├─ PageRank: network importance
  │   ├─ Clustering: local density
  │   └─ Centrality: influence
  ├→ Anomaly detection
  │   ├─ Isolation forest-like scoring
  │   └─ Fraud risk assessment
  └→ Trust score aggregation
Output: {score: 0-100, confidence: 0-1, ...}
```

**Signal 3: Satellite Crop**
```
Input: location {lat, lon}, cropType
  ├→ Query Sentinel-2 API
  │   ├─ Fetch L2A imagery (10m resolution)
  │   └─ Extract Red, NIR bands
  ├→ Compute NDVI
  │   └─ NDVI = (NIR - Red) / (NIR + Red)
  ├→ Compare to crop-specific baselines
  ├→ Health categorization
  │   ├─ HEALTHY: NDVI > 0.6
  │   ├─ STRESSED: 0.4-0.6
  │   ├─ CRITICAL: 0.2-0.4
  │   └─ NEWLY_PLANTED: < 0.2
  ├→ Fraud detection
  │   └─ Temporal consistency check
  └→ Health score
Output: {score: 0-100, confidence: 0-1, ...}
```

**Signal 4: Behavior Signal**
```
Input: farmerId
  ├→ Fetch UPI transaction history (90 days)
  ├→ Fetch mobile recharge history (90 days)
  ├→ Analyze patterns
  │   ├─ Frequency consistency (coefficient of variation)
  │   ├─ Trend (improving/declining)
  │   ├─ Seasonality adjustment
  │   └─ Inactivity periods
  ├→ Anomaly scoring
  │   ├─ Sudden spikes/drops
  │   └─ No-activity gaps > 15 days
  └→ Discipline score
Output: {score: 0-100, confidence: 0-1, ...}
```

### 4. Fusion → GramScore
```
All 4 signals scored (0-100) + confidence (0-1)
        ↓
    Normalization
    (min-max or z-score)
        ↓
    Weighted Combination
    GramScore = 
      0.25 × Voice_Score +
      0.30 × Social_Score +
      0.30 × Satellite_Score +
      0.15 × Behavior_Score
        ↓
    Confidence-weighted adjustment
    (optional)
        ↓
    GramScore: 0-100
    + Signal breakdown
    + Confidence estimates
```

### 5. Decision Engine
```
GramScore
    ↓
Eligibility checks
├─ Age: 18-65 ✓
├─ Location: Valid GPS ✓
├─ Land: 0.1-100 hectares ✓
├─ Signal confidence: all ≥ 0.4 ✓
└─ No major red flags ✓
    ↓
Decision tree
├─ GramScore >= 75
│   └─ APPROVED: Standard Loan (₹100,000)
├─ GramScore >= 60
│   └─ APPROVED: Mini Loan (₹25,000)
├─ GramScore >= 40
│   └─ APPROVED: Micro Loan (₹5,000)
└─ GramScore < 40
    └─ REJECTED: Below minimum threshold
    ↓
Output:
{
  decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
  approvedAmount: number | null,
  reasonCode: "APPROVED_STANDARD" | "REJECTED_SCORE_BELOW_MINIMUM" | ...
}
```

### 6. Disbursement (if Approved)
```
Approved Amount + GramScore
    ↓
Calculate Interest Rate
├─ Base: GRAMCREDIT_INTEREST_RATE_MIN (10%)
├─ Range: 10-18% p.a.
└─ Adjustment: GramScore/100 × (max - min)
    ↓
Select Tenure
├─ Default: 18 months
├─ Range: 12-24 months
└─ Configurable per loan band
    ↓
Amortization Calculation
├─ EMI = P × r × (1+r)^n / ((1+r)^n - 1)
├─ P = Principal (approved amount)
├─ r = Monthly rate (annual / 12)
└─ n = Tenure (months)
    ↓
Generate Schedule
├─ Month 1-24: Principal, Interest, Payment
├─ Running balance
└─ Late payment penalties (2% p.m.)
    ↓
Output:
{
  approvedAmount,
  interestRate,
  tenure,
  monthlyPayment,
  totalRepayment,
  repaymentSchedule: [...]
}
```

### 7. Attribution + Explanations
```
GramScore + All Signals
    ↓
Compute Attributions
├─ Baseline: Median historical scores
├─ Marginal Value = Signal_Score - Baseline
├─ Contribution = Weight × Marginal × Confidence
├─ Direction: Positive (helps) / Negative (hurts) / Neutral
└─ Rank by importance
    ↓
Generate Explanations (5 languages)
├─ Context selection: APPROVED / REJECTED / etc.
├─ Template interpolation
├─ Reason code translation
├─ Personalization (name, amounts, etc.)
└─ Output: {en: "...", hi: "...", ta: "...", ...}
    ↓
Output:
{
  attributions: [
    {signalName, contribution, direction, explanation},
    ...
  ],
  explanation: {en, hi, ta, te, kn}
}
```

### 8. Trace Logging
```
Throughout pipeline, capture:
├─ INPUT events: Data received + validated
├─ PROCESSING events: Each step (transcription, GNN, NDVI, etc.)
├─ OUTPUT events: Results generated
├─ ERROR events: Any failures
└─ VALIDATION events: Rules applied

Generate TraceEvent array with:
├─ Timestamp
├─ Module name
├─ Event type
├─ Data (sanitized)
└─ Processing time

Store/return:
{
  traceId: "unique-id",
  farmerId: "...",
  events: [...],
  totalProcessingMs: 2847
}
```

---

## Component Interaction Matrix

| Component | Consumes | Produces |
|-----------|----------|----------|
| Orchestrator | ApplicationRequest | {decision, gramScore, disbursement, explanation, attributions, trace} |
| Voice Engine | audioBlob | VoiceModuleOutput {score, confidence, traits} |
| Social Engine | farmerId | SocialGraphModuleOutput {score, confidence, networkMetrics} |
| Satellite Engine | location, cropType | SatelliteModuleOutput {score, confidence, ndvi, health} |
| Behavior Engine | farmerId | BehaviorModuleOutput {score, confidence, patterns} |
| Fusion Engine | All 4 module outputs | GramScoreOutput {score, signals, confidence} |
| Decision Engine | GramScoreOutput | DecisionOutput {decision, reasonCode, approvedAmount} |
| Disbursement Engine | DecisionOutput | DisbursementDetails {amount, rate, tenure, schedule} |
| SHAP Attributor | GramScoreOutput + all signals | FeatureAttribution[] |
| i18n Explainer | DecisionOutput + attributions | {en: "...", hi: "...", ...} |
| Trace Logger | All events | TraceEvent[] |

---

## Configuration Hierarchy

```
Environment Variables (.env.local)
    ↓
ConfigSchema (Zod)
    ├─ Parse & validate
    ├─ Merge with defaults
    └─ Return TypedConfig
    ↓
Modules import config
    ├─ Voice: Groq model, temperature, max_tokens
    ├─ Social: GNN params, threshold cutoffs
    ├─ Satellite: API endpoints, crop baselines
    ├─ Behavior: Time windows, anomaly bounds
    ├─ Fusion: Weights, normalization method
    ├─ Decision: Thresholds (40, 60, 75)
    ├─ Disbursement: Rates, tenures, penalties
    ├─ Explainability: Prompts, templates
    └─ Logger: Log level, retention, sanitization
    ↓
Runtime behavior fully determined by config
(No hardcoding, no magic numbers)
```

---

## Error Handling Flow

```
Try:
  ├─ Input validation (Zod) → InvalidProfileError
  ├─ Whisper API call → AudioProcessingError
  ├─ Groq API call → LLMProcessingError
  ├─ Sentinel-2 query → SatelliteDataError
  ├─ GNN inference → GNNInferenceError
  ├─ Math computation → ComputationError
  └─ Config loading → ConfigError

Catch:
  ├─ Log error with module name
  ├─ Generate error reason code
  ├─ Include in trace
  ├─ Return meaningful message
  └─ NO silent failures (explicit codes)

Return:
  {
    error: "Human-readable message",
    reasonCode: "AUDIO_PROCESSING_ERROR",
    details: "Whisper API rate limited",
    trace: {...}
  }
```

---

## Performance Characteristics

```
Signal Scoring (Parallel):
├─ Voice: 1.5-2.0s (Whisper + Groq)
├─ Social: 0.3-0.5s (GNN/metrics)
├─ Satellite: 1.0-1.5s (Sentinel-2 API)
└─ Behavior: 0.2-0.3s (time-series)
  └─ Parallel total: ~2.0-2.5s

Post-processing (Sequential):
├─ Fusion: 0.05s
├─ Decision: 0.02s
├─ Disbursement: 0.1s
├─ Attribution: 0.3s
├─ Explanation: 0.5-1.0s
└─ Logging: 0.1s
  └─ Sequential total: ~1.2-1.7s

Overall E2E: 3-4 seconds typical
Peak (all fresh APIs): 5-6 seconds
```

---

## Scalability Considerations

**Current Architecture** (Single App Router):
- Suitable for: 0-100 applications/day
- Latency: 3-5 seconds
- Memory: ~500MB per request

**For Production Scaling**:
1. Add job queue (Bull/BullMQ) for async processing
2. Cache Sentinel-2 results (Redis)
3. Batch GNN inference (GPU acceleration)
4. Implement rate limiting by farmer_id
5. Add database indexing on frequently queried fields
6. Monitor Groq/OpenAI API costs

---

**Architecture version**: 1.0.0
**Last updated**: April 8, 2026
