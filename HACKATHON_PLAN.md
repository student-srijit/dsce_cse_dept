# GramCredit Hackathon Plan (Execution-Ready)

## 1) Problem Statement

Rural farmers needing emergency personal credit are often excluded from formal underwriting because they have no CIBIL history. GramCredit converts informal trust and real-world farming signals into explainable, fast micro-credit decisions.

## 2) Hackathon Demo Goal

Deliver a full decision in under 2 minutes:

1. Farmer profile intake
2. Voice interview capture
3. Parallel AI scoring of 4 signals
4. GramScore + explainability
5. Loan decision + repayment schedule

## 3) Core Innovation

A single fusion pipeline that combines:

1. Social Trust GNN (UPI + SHG network)
2. Voice Psychometric Scoring (OCEAN traits)
3. Satellite Crop Signal (NDVI/fraud checks)
4. Mobile Behavior Signal (transaction regularity)

## 4) AI Architecture For Judges

### 4.1 Social Trust GNN

- Input: graph nodes (farmers), edges (trust interactions)
- Method: two-layer message passing over neighbor embeddings
- Output: trust score, confidence, anomaly risk
- Implementation status: integrated in social engine and enabled by env toggle

### 4.2 Voice Psychometric

- Input: recorded interview audio
- STT: OpenAI-compatible transcription endpoint (Groq default)
- LLM trait extraction: OCEAN from transcript
- Output: voice score + reason codes

### 4.3 Satellite Crop Signal

- Input: lat/lon + crop type
- Current mode: mock-safe default for demo reliability
- Optional providers: Sentinel/Bhuvan when API credentials are available

### 4.4 Behavior Signal

- Input: transaction/recharge behavioral pattern features
- Output: discipline score and anomaly indicators

### 4.5 Fusion + Explainability

- Weighted fusion into GramScore
- Decision thresholds for MICRO, MINI, STANDARD
- SHAP-style per-signal contribution output
- Local-language explanation response

## 5) Free-Tier API Strategy

Required for demo:

1. GROQ_API_KEY (free tier) for transcription and OCEAN extraction

Optional:

1. OPENAI_API_KEY only if you choose OpenAI STT provider
2. Satellite keys are optional because demo can run in mock mode

## 6) Product Experience Plan

### Home Page

- Story-first messaging for judges
- Signal cards showing model depth
- Build-phase plan visibility
- Strong CTA into live demo flow

### Try Page

- 3-step funnel: Profile -> Voice -> Result
- Processing state for real-time AI inference feel
- Decision card with repayment details
- Explainability card with top reasons and improvements

## 7) Demo Script (3 Minutes)

1. Introduce crisis: no formal credit history, urgent emergency need
2. Run profile + voice capture live
3. Show social GNN trust scoring + other signals
4. Reveal GramScore and decision
5. Explain attributions in plain language
6. Show repayment terms and borrower-safe timeline

## 8) Judging Hooks

1. Novel multi-signal design implemented together
2. Actual graph intelligence (not simple rule-based social score)
3. Explainability + language accessibility
4. Deployment-ready API and UI flow

## 9) Post-Hackathon Hardening

1. Connect real village data sources with consent layers
2. Add privacy-preserving/federated training path
3. Bias and fairness audits by district and language
4. Integrate production KYC + lender rails

## 10) Success Criteria

1. End-to-end application runs without manual patches
2. Decision latency under 120 seconds on average
3. Clear explanation shown for every decision
4. Zero hidden defaults for required user fields
