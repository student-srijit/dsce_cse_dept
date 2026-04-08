# GramCredit Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env.local` and fill the required values:

```env
# Required (free tier available)
GROQ_API_KEY=<your-groq-api-key>
GRAMCREDIT_STT_PROVIDER=groq
GRAMCREDIT_STT_MODEL=whisper-large-v3-turbo

# Optional fallback (paid) only if you set GRAMCREDIT_STT_PROVIDER=openai
OPENAI_API_KEY=<your-openai-api-key>

# Optional satellite providers (default mock does not require keys)
GRAMCREDIT_SATELLITE_PROVIDER=mock
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=
BHUVAN_API_KEY=

# GramCredit Configuration (Optional, uses sensible defaults)
GRAMCREDIT_SOCIAL_USE_GNN_MODEL=true
GRAMCREDIT_WEIGHT_VOICE=0.25
GRAMCREDIT_WEIGHT_SOCIAL=0.30
GRAMCREDIT_WEIGHT_SATELLITE=0.30
GRAMCREDIT_WEIGHT_BEHAVIOR=0.15
```

### 3. Get API Keys

#### Groq API Key

1. Visit https://console.groq.com
2. Sign up or log in
3. Create a new API key
4. Copy and paste into `.env.local`

#### OpenAI API Key (Optional)

1. Only needed if `GRAMCREDIT_STT_PROVIDER=openai`
2. Visit https://platform.openai.com/api-keys
3. Create a new API key
4. Add to `.env.local`

#### Sentinel Hub API Key (Optional)

1. Visit https://www.sentinel-hub.com
2. Sign up for free tier
3. Create an API key in your dashboard

### 4. Run Locally

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### 4.1 Train Full Social GNN Model (Hackathon)

Use this when you want to show a trained neural graph model, not only fixed weights:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ml/gnn/requirements.txt
pnpm gnn:train
```

This exports trained tensors to `ml/gnn/gnn-weights.generated.json`, which you can copy into
`lib/gramcredit/engines/social-graph/model/gnn-trained-weights.ts` for app inference.

The app will work with **mock data** for signals you don't have API keys for:

- Voice: Uses mock OCEAN profiles
- Social: Generates synthetic UPI networks
- Satellite: Simulates NDVI values
- Behavior: Creates mock transaction history

### 5. Test End-to-End

1. **Fill profile**: Enter farmer details, select language
2. **Record audio**: Click "Start Recording" and speak naturally (30-60 seconds)
3. **Review decision**: See loan decision, amount, and explanation in your language

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Settings → Environment Variables → Add each var from .env.local
```

---

## Architecture Overview

```
/app
  /api/gramcredit/apply     → POST endpoint for loan applications
  /page.tsx                 → Hackathon landing page
  /try/page.tsx             → Live demo flow (profile, voice, result)
  /layout.tsx               → Layout with metadata

/components/gramcredit
  /voice-recorder.tsx       → Audio capture component
  /farmer-profile-form.tsx  → Profile collection form
  /decision-card.tsx        → Loan decision display
  /explanation-card.tsx     → SHAP attribution + reasons

/lib/gramcredit
  /core                     → Types, config, trace logger
  /engines                  → 4 signal engines
    /voice-psychometric     → Whisper + Groq OCEAN
    /social-graph           → UPI networks + GNN
    /satellite-crop         → Sentinel-2 + NDVI
    /behavior-signal        → Transaction patterns
  /fusion                   → GramScore + Decision + Disbursement
  /explainability           → SHAP + Multilingual explanations
  /orchestrator.ts          → Main pipeline
```

---

## Database (Optional)

### PostgreSQL Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. Create tables:

```sql
CREATE TABLE gramcredit_applications (
  id SERIAL PRIMARY KEY,
  farmer_id VARCHAR(255) UNIQUE NOT NULL,
  profile JSONB NOT NULL,
  decision VARCHAR(50) NOT NULL,
  gram_score FLOAT NOT NULL,
  approved_amount INTEGER,
  trace_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gramcredit_traces (
  id SERIAL PRIMARY KEY,
  trace_id VARCHAR(255) UNIQUE NOT NULL,
  farmer_id VARCHAR(255),
  events JSONB NOT NULL,
  processing_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

3. Add to `.env.local`:

```env
DATABASE_URL=postgresql://user:password@host/dbname
```

4. Update `/lib/gramcredit/core/trace-logger.ts` to enable database persistence

---

## Monitoring & Debugging

### View Application Logs

```bash
# Development
pnpm dev

# Vercel
vercel logs

# Check specific deployment
vercel logs --since 1h
```

### Test the API Directly

```bash
curl -X POST http://localhost:3000/api/gramcredit/apply \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "test_farmer",
    "audioBlob": "<base64-audio>",
    "farmerProfile": {
      "name": "Test Farmer",
      "age": 35,
      "state": "Maharashtra",
      "location": {"lat": 20.5937, "lon": 78.9629},
      "cropType": "wheat",
      "landSizeHectares": 2.5,
      "preferredLanguage": "en"
    },
    "requestedLoanAmount": 50000
  }'
```

### Performance Metrics

The API returns `processing_ms` in the trace object:

```json
{
  "trace": {
    "totalProcessingMs": 2847 // ~2.8 seconds
  }
}
```

**Typical Breakdown**:

- Voice transcription: 1.5-2s
- Signal scoring (parallel): 1-1.5s
- Fusion + decision: 0.2s
- Explainability: 0.5-1s

---

## Configuration Reference

### All Configurable Parameters

#### Signal Weights (must sum to 1.0)

```env
GRAMCREDIT_SIGNAL_WEIGHTS_VOICE=0.25        # 25%
GRAMCREDIT_SIGNAL_WEIGHTS_SOCIAL=0.30       # 30%
GRAMCREDIT_SIGNAL_WEIGHTS_SATELLITE=0.30    # 30%
GRAMCREDIT_SIGNAL_WEIGHTS_BEHAVIOR=0.15     # 15%
```

#### Approval Thresholds (GramScore)

```env
GRAMCREDIT_APPROVAL_THRESHOLD_MICRO=40      # Minimum for micro loans
GRAMCREDIT_APPROVAL_THRESHOLD_MINI=60       # Minimum for mini loans
GRAMCREDIT_APPROVAL_THRESHOLD_STANDARD=75   # Minimum for standard loans
```

#### Loan Amounts (₹)

```env
GRAMCREDIT_LOAN_AMOUNT_MICRO=5000
GRAMCREDIT_LOAN_AMOUNT_MINI=25000
GRAMCREDIT_LOAN_AMOUNT_STANDARD=100000
```

#### Interest Rates (p.a., %)

```env
GRAMCREDIT_INTEREST_RATE_MIN=10.0           # Minimum for highest scores
GRAMCREDIT_INTEREST_RATE_MAX=18.0           # Maximum for lowest scores
```

#### Tenure (Months)

```env
GRAMCREDIT_TENURE_MIN=12                    # Minimum months
GRAMCREDIT_TENURE_MAX=24                    # Maximum months
```

#### Signal Normalization

```env
GRAMCREDIT_NORMALIZE_METHOD=minmax           # Options: minmax, zscore
GRAMCREDIT_CONFIDENCE_THRESHOLD=0.5         # Minimum confidence to proceed
```

---

## Troubleshooting

### "Failed to access microphone"

- Check browser permissions for microphone
- Ensure HTTPS in production (some browsers require it)
- Try a different browser

### "Audio processing failed"

- Check OpenAI API key is valid
- Verify audio is at least 3 seconds long
- Check audio quality (background noise can affect STT)

### "GramScore is NaN"

- Check all 4 signal engines returned valid scores
- Verify signal weights sum to 1.0
- Check no confidence values are null

### "Groq API timeout"

- Groq is highly available, but can have rate limits
- Implement retry logic with exponential backoff
- Use mock data for testing during outages

### Missing language explanations

- Check `preferredLanguage` is one of: `en`, `hi`, `ta`, `te`, `kn`
- Falls back to English if not found
- Add new languages in `/lib/gramcredit/explainability/i18n-explainer.ts`

---

## Performance Optimization

### Caching

- Cache Sentinel-2 NDVI results for 7 days (rarely changes)
- Cache OCEAN trait models locally
- Cache GNN model weights

### Rate Limiting

```typescript
// Add to API route
const rateLimit = new Map();
const MAX_REQUESTS = 100;
const TIME_WINDOW = 3600000; // 1 hour

function checkRateLimit(farmerId: string) {
  const now = Date.now();
  const userRequests = rateLimit.get(farmerId) || [];
  const recent = userRequests.filter((t) => now - t < TIME_WINDOW);

  if (recent.length >= MAX_REQUESTS) {
    throw new Error("Rate limit exceeded");
  }

  recent.push(now);
  rateLimit.set(farmerId, recent);
}
```

### Parallel Processing

✅ Already implemented:

- All 4 signal engines score concurrently
- Uses `Promise.allSettled()` for fault tolerance

---

## Security Checklist

- [ ] Remove `.env.local` from git (add to `.gitignore`)
- [ ] Use HTTPS in production (enforced by Vercel)
- [ ] Set up CORS headers for frontend
- [ ] Validate all inputs (already done with Zod)
- [ ] Sanitize logs (already done in TraceLogger)
- [ ] Implement rate limiting
- [ ] Set up API key rotation schedule
- [ ] Enable database encryption at rest
- [ ] Use environment secrets in Vercel dashboard

---

## Cost Estimation

**Monthly costs (1,000 applications)**:

- Groq API: $10-20 (OCEAN extraction)
- OpenAI Whisper: $5-10 (STT)
- Sentinel Hub: $0 (free tier) or $50-100 (commercial)
- Vercel: $20-50 (serverless functions)
- **Total: $35-180/month**

---

## Next Steps

1. Get API keys (Groq, OpenAI)
2. Run locally with `pnpm dev`
3. Test end-to-end with mock data
4. Deploy to Vercel with `vercel --prod`
5. Set up PostgreSQL for audit trail (optional)
6. Monitor performance and adjust signal weights
7. Integrate with real UPI/bank APIs
8. Build admin dashboard for loan management

---

## Support & Resources

- **GramCredit Docs**: See `GRAMCREDIT.md`
- **Groq API Docs**: https://console.groq.com/docs
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text
- **Sentinel Hub**: https://www.sentinel-hub.com/docs
- **Vercel Deployment**: https://vercel.com/docs/deployments

---

**Last Updated**: April 8, 2026
**Version**: 1.0.0
