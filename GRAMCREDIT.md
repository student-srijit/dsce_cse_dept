# GramCredit: AI Rural Micro-Credit Platform

**An intelligent, modular, and fully explainable rural micro-credit system that uses voice interviews, social trust networks, satellite crop analysis, and behavioral signals to provide emergency loans to farmers with no formal credit history.**

---

## Overview

GramCredit is a production-grade AI platform that automates the loan approval process for rural farmers by combining four independent signal engines into a single explainable GramScore. The system is built with:

- **Zero hardcoding**: All thresholds, weights, and configurations live in typed Zod schemas
- **Full explainability**: SHAP-style feature attribution with multilingual explanations
- **Modular architecture**: Each signal engine is independently testable and upgradeable
- **Comprehensive tracing**: Every decision step is logged for audit and dispute resolution
- **No silent failures**: Explicit error codes and reason codes for all paths

---

## Architecture

### Core Components

#### 1. **Voice Psychometric Engine** (`/lib/gramcredit/engines/voice-psychometric/`)

- **Input**: Live audio recording via Web Audio API → Whisper STT transcription
- **Processing**: Groq LLM extracts Big Five (OCEAN) personality traits
- **Output**: Voice interview score (0-100) with confidence and trait breakdown
- **Key Metrics**:
  - Conscientiousness (40% weight) - reliability & discipline
  - Agreeableness (25% weight) - trustworthiness & cooperation
  - Emotional Stability (20% weight) - stress resilience
  - Speech quality adjustment - penalizes low-quality audio

**Files**:

- `transcriber.ts` - Whisper integration for STT
- `trait-scorer.ts` - Groq LLM for OCEAN extraction
- `index.ts` - Module orchestrator

---

#### 2. **Social Graph Engine** (`/lib/gramcredit/engines/social-graph/`)

- **Input**: UPI transaction networks + SHG (Self-Help Group) membership
- **Processing**: Full GraphSAGE-style neural inference (layered message passing) with fallback metrics
- **Output**: Social trust score (0-100) based on:
  - PageRank centrality (network importance)
  - Clustering coefficient (local network density)
  - Repayment history anomaly detection
  - Fraud signals in transaction patterns

**Key Metrics**:

- Network connectivity strength
- Historical SHG repayment compliance
- Outlier detection using isolation forest-like heuristics

**Files**:

- `mock-data.ts` - Generates realistic UPI networks for testing
- `gnn-scorer.ts` - Graph neural network implementation
- `model/gnn-trained-weights.ts` - Neural model tensors used for inference
- `index.ts` - Module orchestrator

**Training assets**:

- `ml/gnn/train_social_gnn.py` - PyTorch Geometric GraphSAGE trainer + exporter
- `ml/gnn/requirements.txt` - Python dependencies for training

---

#### 3. **Satellite Crop Scorer** (`/lib/gramcredit/engines/satellite-crop/`)

- **Input**: GPS coordinates + crop type → Sentinel-2 imagery + NDVI analysis
- **Processing**:
  - Real integration with ESA Sentinel-2 L2A data
  - ISRO Bhuvan NDVI fallback
  - Crop-specific health baselines
- **Output**: Crop health score (0-100) + fraud detection
- **Health Categories**:
  - HEALTHY (NDVI > 0.6)
  - STRESSED (0.4-0.6)
  - CRITICAL (0.2-0.4)
  - RECENTLY_PLANTED (< 0.2)

**Key Metrics**:

- NDVI (Normalized Difference Vegetation Index) analysis
- Temporal consistency (no sudden health drops = fraud risk)
- Crop-specific thresholds (rice vs. wheat vs. cotton)

**Files**:

- `index.ts` - Sentinel-2 API integration + NDVI computation

---

#### 4. **Behavior Signal Engine** (`/lib/gramcredit/engines/behavior-signal/`)

- **Input**: UPI transaction logs + mobile recharge history (30-90 days)
- **Processing**: Time-series analysis for financial discipline
- **Output**: Behavior score (0-100) measuring:
  - Transaction frequency & consistency
  - Recharge regularity patterns
  - Anomaly detection (sudden activity spikes/drops)
  - Inactivity risk (gaps > 15 days)

**Key Metrics**:

- Coefficient of variation (consistency)
- Trend analysis (improving/declining)
- Seasonal adjustment for agricultural cycles

**Files**:

- `index.ts` - Complete behavior analysis pipeline

---

### Fusion & Decision Engines

#### 5. **GramScore Fusion Engine** (`/lib/gramcredit/fusion/gram-score-engine.ts`)

Combines all 4 signals into a single explainable score (0-100):

```
GramScore =
  0.25 × Voice_Score +
  0.30 × Social_Score +
  0.30 × Satellite_Score +
  0.15 × Behavior_Score
```

**Features**:

- Min-max normalization of input scores
- Optional non-linear transforms (sigmoid, ReLU)
- Confidence-weighted fusion
- Graceful degradation if any signal fails

---

#### 6. **Decision Engine** (`/lib/gramcredit/fusion/decision-engine.ts`)

Applies eligibility rules and makes approval/rejection decisions:

**Eligibility Checks**:

- Age: 18-65 years
- Land size: 0.1-100 hectares
- Location: Valid Indian coordinates
- Signal confidence: All signals ≥ 0.4 confidence

**Approval Tiers**:

- **MICRO** (₹5,000) - GramScore ≥ 40
- **MINI** (₹25,000) - GramScore ≥ 60
- **STANDARD** (₹100,000) - GramScore ≥ 75

**Rejection Codes**:

- `SCORE_BELOW_MINIMUM`
- `FAILED_ELIGIBILITY`
- `INSUFFICIENT_SIGNAL_CONFIDENCE`
- `INVALID_PROFILE`

---

#### 7. **Disbursement Engine** (`/lib/gramcredit/fusion/disbursement-engine.ts`)

Calculates loan terms and generates repayment schedules:

**Calculation**:

- Interest rate: 10-18% p.a. (GramScore-adjusted)
- Tenure: 12-24 months (configurable)
- EMI: Standard amortization formula
- Late payment penalty: 2% per month (configurable)

**Output**:

- Monthly payment amount
- Full repayment schedule (month-by-month breakdown)
- Total interest cost
- Early repayment clauses

---

### Explainability Layer

#### 8. **SHAP Attributor** (`/lib/gramcredit/explainability/shap-attributor.ts`)

Generates feature attribution scores showing which signals drove the decision:

**Attribution Method**:

```
Contribution = Weight × (Actual_Score - Baseline_Score) × Confidence
Direction = positive (helps approval) | negative (hurts approval) | neutral
```

**Output**:

- Per-signal marginal contribution
- Direction and magnitude
- Confidence-weighted importance ranking
- Top-3 driver identification

---

#### 9. **Multilingual Explainer** (`/lib/gramcredit/explainability/i18n-explainer.ts`)

Generates human-readable explanations in farmer's preferred language:

**Supported Languages**:

- 🇬🇧 English (en)
- 🇮🇳 Hindi (hi) - हिंदी
- 🇮🇳 Tamil (ta) - தமிழ்
- 🇮🇳 Telugu (te) - తెలుగు
- 🇮🇳 Kannada (kn) - ಕನ್ನಡ

**Explanation Contexts**:

- `APPROVED_STANDARD_LOAN` - Full loan approved
- `APPROVED_MINI_LOAN` - Reduced amount approved
- `APPROVED_MICRO_LOAN` - Micro credit approved
- `REJECTED` - Application declined with suggestions
- `UNDER_REVIEW` - Manual review required

**Example Outputs**:

```
EN: "Your strong social network and consistent financial behavior
    earned you a Standard Loan of ₹100,000. Your crop health looks
    good, and your repayment reliability score is excellent."

HI: "आपके मजबूत सामाजिक नेटवर्क और सुसंगत वित्तीय व्यवहार
    ने आपको ₹100,000 का मानक ऋण दिया है।"
```

---

## Configuration System

All system parameters are configured via environment variables and validated with Zod:

### Required API Keys

```env
GROQ_API_KEY=<your-groq-api-key>              # Free-tier, used for OCEAN + default STT
GRAMCREDIT_STT_PROVIDER=groq                  # groq | openai
GRAMCREDIT_STT_MODEL=whisper-large-v3-turbo

# Optional only if using OPENAI provider for STT
OPENAI_API_KEY=<your-openai-api-key>

# Optional satellite providers (default can run mock without keys)
GRAMCREDIT_SATELLITE_PROVIDER=mock
SENTINEL_HUB_CLIENT_ID=<optional>
SENTINEL_HUB_CLIENT_SECRET=<optional>
BHUVAN_API_KEY=<optional>
```

### Configurable Thresholds

```env
# Signal Weights (must sum to 1.0)
GRAMCREDIT_SIGNAL_WEIGHTS_VOICE=0.25
GRAMCREDIT_SIGNAL_WEIGHTS_SOCIAL=0.30
GRAMCREDIT_SIGNAL_WEIGHTS_SATELLITE=0.30
GRAMCREDIT_SIGNAL_WEIGHTS_BEHAVIOR=0.15

# Approval Thresholds
GRAMCREDIT_APPROVAL_THRESHOLD_MICRO=40
GRAMCREDIT_APPROVAL_THRESHOLD_MINI=60
GRAMCREDIT_APPROVAL_THRESHOLD_STANDARD=75

# Loan Amounts
GRAMCREDIT_LOAN_AMOUNT_MICRO=5000
GRAMCREDIT_LOAN_AMOUNT_MINI=25000
GRAMCREDIT_LOAN_AMOUNT_STANDARD=100000

# Interest Rates (p.a.)
GRAMCREDIT_INTEREST_RATE_MIN=10.0
GRAMCREDIT_INTEREST_RATE_MAX=18.0

# Tenure (months)
GRAMCREDIT_TENURE_MIN=12
GRAMCREDIT_TENURE_MAX=24
```

---

## API Endpoints

### POST /api/gramcredit/apply

Processes a farmer loan application through the full pipeline.

**Request**:

```json
{
  "farmerId": "farmer_123",
  "audioBlob": "<base64-encoded-webm-audio>",
  "farmerProfile": {
    "name": "Rajesh Kumar",
    "age": 35,
    "state": "Maharashtra",
    "location": { "lat": 20.5937, "lon": 78.9629 },
    "cropType": "wheat",
    "landSizeHectares": 2.5,
    "preferredLanguage": "hi"
  },
  "requestedLoanAmount": 50000
}
```

**Response**:

```json
{
  "decision": {
    "decision": "APPROVED",
    "gramScore": 78.5,
    "approvedAmount": 100000,
    "reasonCode": "APPROVED_STANDARD_LOAN"
  },
  "gramScore": {
    "score": 78.5,
    "signals": {
      "voice": 75,
      "social": 82,
      "satellite": 80,
      "behavior": 72
    }
  },
  "disbursement": {
    "loanBand": "STANDARD",
    "approvedAmount": 100000,
    "interestRateAnnual": 14.5,
    "tenureMonths": 18,
    "monthlyPayment": 6247.89,
    "totalRepayment": 112462.02,
    "repaymentSchedule": [...]
  },
  "explanation": {
    "en": "Your application has been approved for a Standard Loan...",
    "hi": "आपके आवेदन को मानक ऋण के लिए मंजूरी दी गई है..."
  },
  "attributions": [
    {
      "signalName": "Social Trust",
      "contribution": 0.35,
      "direction": "positive",
      "explanation": "Your SHG membership and repayment history are excellent."
    }
  ],
  "trace": {
    "traceId": "trace_xyz123",
    "events": [...],
    "totalProcessingMs": 2847
  }
}
```

---

## Frontend Components

### 1. **VoiceRecorder** (`/components/gramcredit/voice-recorder.tsx`)

- Web Audio API recording interface
- Whisper transcription integration
- Real-time audio level visualization
- Re-record capability

### 2. **FarmerProfileForm** (`/components/gramcredit/farmer-profile-form.tsx`)

- Farmer information collection
- State/crop type selection
- Language preference
- Form validation

### 3. **DecisionCard** (`/components/gramcredit/decision-card.tsx`)

- Large, prominent decision display
- Approved: Shows loan amount, tenure, EMI
- Rejected: Shows reason and next steps
- Under Review: Displays timeline

### 4. **ExplanationCard** (`/components/gramcredit/explanation-card.tsx`)

- Signal score visualization (bar chart)
- Top reasons for decision
- Improvement suggestions
- SHAP attribution breakdown

### 5. **Main Application** (`/app/page.tsx`)

- Multi-step application flow (Profile → Voice → Result)
- Progress indicator
- Error handling
- Language-aware explanations

---

## Trace Logging & Audit Trail

Every decision is logged to PostgreSQL for audit, compliance, and model improvement:

### TraceEvent Types

```typescript
INPUT; // Input data received and validated
PROCESSING; // Processing step (signal scoring, fusion, etc.)
OUTPUT; // Final output generated
ERROR; // Error encountered
VALIDATION; // Validation rules applied
```

### Trace Structure

```json
{
  "traceId": "unique-trace-identifier",
  "farmerId": "farmer_123",
  "timestamp": "2026-04-08T12:34:56Z",
  "events": [
    {
      "type": "INPUT",
      "module": "orchestrator",
      "message": "Application received",
      "data": { "farmerId": "farmer_123", ... }
    },
    {
      "type": "PROCESSING",
      "module": "voice-engine",
      "message": "Transcribing audio",
      "data": { "audioSize": 245000, "format": "webm" }
    },
    ...
  ]
}
```

---

## Data Persistence

### PostgreSQL Schema (Optional)

```sql
CREATE TABLE gramcredit_applications (
  id SERIAL PRIMARY KEY,
  farmer_id VARCHAR(255) UNIQUE NOT NULL,
  profile JSONB NOT NULL,
  decision VARCHAR(50) NOT NULL,
  gram_score FLOAT NOT NULL,
  approved_amount INTEGER,
  trace_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gramcredit_traces (
  id SERIAL PRIMARY KEY,
  trace_id VARCHAR(255) UNIQUE NOT NULL,
  farmer_id VARCHAR(255),
  events JSONB NOT NULL,
  processing_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farmer_id ON gramcredit_applications(farmer_id);
CREATE INDEX idx_trace_id ON gramcredit_traces(trace_id);
```

---

## Mock Data & Testing

The system includes comprehensive mock data generators:

### Voice Interviews

Mock OCEAN profiles with realistic score distributions:

```typescript
const mockProfile = {
  openness: 68,
  conscientiousness: 82,
  extraversion: 45,
  agreeableness: 76,
  neuroticism: 32,
};
```

### Social Networks

Generates realistic UPI transaction networks with:

- Varying network sizes (10-100 nodes)
- Transaction amounts (₹100-₹50,000)
- SHG membership patterns
- Repayment compliance rates

### Satellite Data

Generates NDVI values by crop type and season:

```typescript
// Wheat (winter crop)
HEALTHY: 0.65-0.75,
STRESSED: 0.45-0.55,
CRITICAL: 0.25-0.35,
```

### Behavior Signals

Mock UPI transactions and recharge history:

```typescript
- Daily transaction frequency
- Monthly recharge consistency
- Seasonal patterns
- Anomalies (fraud detection)
```

---

## Extensibility

### Adding a New Signal Engine

1. **Create signal module** in `/lib/gramcredit/engines/new-signal/`
2. **Implement `ScoredOutput<T>` interface**:
   ```typescript
   export interface NewSignalOutput extends ScoredOutput<{
     metricA: number;
     metricB: string;
   }> {}
   ```
3. **Register in config** (`/lib/gramcredit/core/config.ts`)
4. **Update weights** to sum to 1.0
5. **Add test cases** and mock data generator

---

## Performance Considerations

- **Parallel signal scoring**: All 4 engines run concurrently via `Promise.allSettled()`
- **Voice processing**: Whisper → Groq inference (2-3s typical)
- **Satellite queries**: Cached NDVI data (1s if cached, 5s fresh)
- **Total latency**: 4-6 seconds typical end-to-end
- **Graceful degradation**: Works with mock data if real APIs unavailable

---

## Security & Privacy

- **Sensitive data sanitization**: Phone numbers, exact coordinates masked in logs
- **No hardcoded credentials**: All via environment variables
- **Audio deletion**: Temporary audio files cleaned up after processing
- **GDPR compliant**: Trace data can be deleted per farmer request
- **RLS-ready**: Database schema supports row-level security

---

## Error Handling

No silent failures. All errors mapped to reason codes:

```typescript
INVALID_PROFILE; // Farmer data incomplete
AUDIO_PROCESSING_ERROR; // Whisper API failure
GEO_OUT_OF_BOUNDS; // Invalid location
CROP_NOT_SUPPORTED; // Crop type not in baseline
INSUFFICIENT_DATA; // Too few transactions for behavior analysis
SIGNAL_TIMEOUT; // API timeout (>10s)
```

---

## Future Enhancements

- [ ] Real TensorFlow.js GNN models vs. metric-based scoring
- [ ] Live Sentinel-2 API integration (currently mocked)
- [ ] ISRO Bhuvan API integration
- [ ] Dynamic interest rate model (ML-based)
- [ ] Repayment prediction & early intervention
- [ ] Mobile app with offline mode
- [ ] Admin dashboard with model performance metrics
- [ ] A/B testing framework for signal weights
- [ ] Real-time fraud detection with streaming data

---

## Dependencies

**Core**:

- `next@16.2.0` - React framework
- `zod@^3.24.1` - Type validation
- `groq-sdk@^0.7.0` - LLM provider

**AI/ML**:

- OpenAI (Whisper STT)
- Groq (OCEAN trait extraction)
- TensorFlow.js (GNN placeholder)

**UI**:

- `shadcn/ui` - Component library
- `recharts@2.15.0` - Data visualization
- `lucide-react` - Icons

---

## License

MIT - Fully open source for educational and commercial use.

---

## Support

For issues, questions, or feature requests, contact the GramCredit team at support@gramcredit.ai

**Built with ❤️ for India's farmers.**
