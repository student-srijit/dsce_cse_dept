"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language/language-provider";

type RiskDecision = "ALLOW" | "STEP_UP" | "BLOCK";

type ApiResponse = {
  ok: boolean;
  timestamp: number;
  riskDecision: RiskDecision;
  fusedRiskScore: number;
  result: {
    transFraud: { riskScore: number; confidence: number; reasonCodes: string[] };
    ghostNet: { riskScore: number; confidence: number; reasonCodes: string[] };
    deepShield: { riskScore: number; confidence: number; reasonCodes: string[] };
    bioSentinel: { riskScore: number; confidence: number; reasonCodes: string[] };
    fedShield: { riskScore: number; confidence: number; reasonCodes: string[] };
    fused: { riskScore: number; confidence: number; reasonCodes: string[] };
  };
};

type FarmerForm = {
  farmerName: string;
  language: "en" | "hi";
  monthlyTxnCount: number;
  avgTxnAmount: number;
  oddHourRatio: number;
  knownFraudLinks: number;
  sharedAccountCount: number;
  kycIntegrity: number;
  faceAuthenticity: number;
  behaviorShift: number;
  suspiciousClientRatio: number;
};

const initialForm: FarmerForm = {
  farmerName: "Ramesh",
  language: "en",
  monthlyTxnCount: 24,
  avgTxnAmount: 2500,
  oddHourRatio: 0.18,
  knownFraudLinks: 0,
  sharedAccountCount: 1,
  kycIntegrity: 0.82,
  faceAuthenticity: 0.88,
  behaviorShift: 0.2,
  suspiciousClientRatio: 0.05,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildPayload(form: FarmerForm) {
  const txCount = clamp(Math.round(form.monthlyTxnCount), 5, 80);
  const oddHourCount = Math.round(txCount * clamp(form.oddHourRatio, 0, 0.95));

  const transactionSequence = Array.from({ length: txCount }).map((_, idx) => {
    const isOdd = idx < oddHourCount;
    return {
      id: `txn_${idx + 1}`,
      userId: "farmer_user_1",
      merchantId: `merchant_${(idx % 7) + 1}`,
      amount: clamp(form.avgTxnAmount + (idx % 5) * 420, 100, 120000),
      hourOfDay: isOdd ? (idx % 2 === 0 ? 1 : 23) : 10 + (idx % 8),
      geoCluster: `g_${(idx % 3) + 1}`,
      deviceHash: "device_farm_1",
      upiHandle: "farmer@upi",
    };
  });

  const userFeatures = [
    {
      userId: "farmer_user_1",
      transactionCount30d: txCount,
      averageAmount: form.avgTxnAmount,
      velocitySpikeRatio: clamp(form.oddHourRatio * 1.2, 0, 1),
      knownFraudLinks: Math.max(0, Math.round(form.knownFraudLinks)),
    },
  ];

  const sharedCount = clamp(Math.round(form.sharedAccountCount), 1, 8);
  const beneficiaryRecords = Array.from({ length: Math.max(3, sharedCount + 1) }).map(
    (_, idx) => ({
      beneficiaryId: `beneficiary_${idx + 1}`,
      aadhaarHash: `aadhaar_${idx + 1}`,
      bankAccountHash: idx < sharedCount ? "bank_shared" : `bank_unique_${idx}`,
      addressHash: idx < sharedCount ? "address_shared" : `address_${idx}`,
      mobileHash: `mobile_${idx}`,
      schemeId: `scheme_${(idx % 4) + 1}`,
      enrollmentTimestamp: Date.now() - (idx + 1) * 24 * 60 * 60 * 1000,
      dormantBeforePayout: idx < sharedCount,
      biometricFailureCount: idx < sharedCount ? 3 + (idx % 3) : 0,
    }),
  );

  const kycIntegrity = clamp(form.kycIntegrity, 0, 1);
  const faceAuthenticity = clamp(form.faceAuthenticity, 0, 1);

  const kycSignals = {
    fontConsistency: kycIntegrity,
    pixelNoiseIntegrity: clamp(kycIntegrity - 0.03, 0, 1),
    qrMatchScore: clamp(kycIntegrity - 0.05, 0, 1),
    microPrintIntegrity: clamp(kycIntegrity - 0.02, 0, 1),
    laminateReflectionScore: clamp(kycIntegrity - 0.01, 0, 1),
    nameMatchScore: clamp(kycIntegrity + 0.03, 0, 1),
  };

  const faceSignals = {
    blinkConsistency: faceAuthenticity,
    textureAuthenticity: clamp(faceAuthenticity - 0.02, 0, 1),
    frequencyArtifactRisk: clamp(1 - faceAuthenticity, 0, 1),
  };

  const baselineBehavior = Array.from({ length: 20 }).map((_, idx) => ({
    userId: "farmer_user_1",
    averageTouchPressure: 0.5 + idx * 0.002,
    averageSwipeVelocity: 1.4 + idx * 0.008,
    averageInterKeyIntervalMs: 185 + idx,
    accelerometerVariance: 0.24 + idx * 0.002,
    pacingSecondsBetweenActions: 3.8 + idx * 0.04,
  }));

  const behaviorShift = clamp(form.behaviorShift, 0, 1);
  const currentBehavior = {
    userId: "farmer_user_1",
    averageTouchPressure: 0.54 + behaviorShift * 0.45,
    averageSwipeVelocity: 1.6 + behaviorShift * 1.4,
    averageInterKeyIntervalMs: 205 + behaviorShift * 230,
    accelerometerVariance: 0.27 + behaviorShift * 0.6,
    pacingSecondsBetweenActions: 4.1 + behaviorShift * 5.1,
  };

  const suspiciousRatio = clamp(form.suspiciousClientRatio, 0, 1);
  const clientCount = 8;
  const suspiciousCount = Math.round(clientCount * suspiciousRatio);
  const federatedClients = Array.from({ length: clientCount }).map((_, idx) => ({
    clientId: `bank_${idx + 1}`,
    localAuc: clamp(0.9 - suspiciousRatio * 0.2 - idx * 0.006, 0.55, 0.95),
    gradientNorm: clamp(3.5 + suspiciousRatio * 7 + idx * 0.35, 1, 20),
    sampleCount: 8000 + idx * 1300,
    suspiciousUpdate: idx < suspiciousCount,
  }));

  return {
    transactionSequence,
    userFeatures,
    beneficiaryRecords,
    kycSignals,
    faceSignals,
    baselineBehavior,
    currentBehavior,
    federatedClients,
  };
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-red-700";
  if (score >= 45) return "text-amber-700";
  return "text-emerald-700";
}

function riskBand(score: number, language: "en" | "hi") {
  if (score >= 70) {
    return {
      label: language === "hi" ? "उच्च जोखिम" : "High Risk",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      meaning:
        language === "hi"
          ? "इस स्कोर पर मजबूत धोखाधड़ी या दुरुपयोग संकेत माने जाते हैं।"
          : "This range indicates strong fraud or misuse signals.",
    };
  }
  if (score >= 45) {
    return {
      label: language === "hi" ? "मध्यम जोखिम" : "Moderate Risk",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      meaning:
        language === "hi"
          ? "अतिरिक्त सत्यापन या स्टेप-अप चेक की जरूरत हो सकती है।"
          : "Additional verification or step-up checks are recommended.",
    };
  }
  return {
    label: language === "hi" ? "निम्न जोखिम" : "Low Risk",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    meaning:
      language === "hi"
        ? "तुरंत बड़े जोखिम संकेत नहीं दिखे, सामान्य मॉनिटरिंग पर्याप्त है।"
        : "No major immediate risk signal detected; standard monitoring is enough.",
  };
}

function moduleExplanation(moduleName: string, language: "en" | "hi") {
  const map: Record<string, { title: string; checks: string; usage: string }> = {
    TransFraud: {
      title: language === "hi" ? "लेनदेन धोखाधड़ी जोखिम" : "Transaction Fraud Risk",
      checks:
        language === "hi"
          ? "ट्रांजैक्शन समय, राशि, गति और असामान्य पैटर्न देखकर UPI दुरुपयोग संकेत खोजता है।"
          : "Examines timing, amount, velocity, and unusual transaction patterns to detect UPI misuse.",
      usage:
        language === "hi"
          ? "उच्च स्कोर मतलब ट्रांजैक्शन फ्लो में संदिग्ध गतिविधि ज्यादा है।"
          : "Higher score means more suspicious behavior in transaction flow.",
    },
    GhostNet: {
      title: language === "hi" ? "घोस्ट लाभार्थी जोखिम" : "Ghost Beneficiary Risk",
      checks:
        language === "hi"
          ? "साझा खाते, एक जैसे पते, डॉर्मेंट अकाउंट एक्टिवेशन और पहचान-लिंक क्लस्टर जांचता है।"
          : "Checks shared accounts, repeated addresses, dormant account activations, and identity-link clusters.",
      usage:
        language === "hi"
          ? "उच्च स्कोर मतलब नकली/डुप्लिकेट पहचान नेटवर्क की संभावना बढ़ती है।"
          : "Higher score suggests possible fake or duplicate identity networks.",
    },
    DeepShield: {
      title: language === "hi" ? "KYC प्रामाणिकता जोखिम" : "KYC Authenticity Risk",
      checks:
        language === "hi"
          ? "दस्तावेज़ गुणवत्ता, QR मिलान, चेहरा-प्रामाणिकता और डीपफेक संकेत का मूल्यांकन करता है।"
          : "Evaluates document quality, QR consistency, face authenticity, and deepfake indicators.",
      usage:
        language === "hi"
          ? "उच्च स्कोर मतलब KYC टैंपरिंग या फर्जी पहचान का खतरा ज्यादा है।"
          : "Higher score means elevated risk of KYC tampering or synthetic identity.",
    },
    BioSentinel: {
      title: language === "hi" ? "व्यवहारिक प्रमाणीकरण जोखिम" : "Behavioral Authentication Risk",
      checks:
        language === "hi"
          ? "टाइपिंग/टच/स्वाइप पैटर्न की तुलना बेसलाइन से करके अकाउंट टेकओवर जोखिम देखता है।"
          : "Compares typing/touch/swipe behavior against baseline to detect account takeover risk.",
      usage:
        language === "hi"
          ? "उच्च स्कोर मतलब वर्तमान उपयोगकर्ता का व्यवहार सामान्य प्रोफाइल से काफी अलग है।"
          : "Higher score indicates current behavior deviates strongly from known baseline.",
    },
    FedShield: {
      title: language === "hi" ? "फेडरेटेड नेटवर्क जोखिम" : "Federated Network Risk",
      checks:
        language === "hi"
          ? "बैंकों से आए मॉडल अपडेट में संदिग्ध पैटर्न, ग्रेडिएंट विचलन और भागीदारी गुणवत्ता जांचता है।"
          : "Checks suspicious gradient updates, drift, and participation quality across federated bank clients.",
      usage:
        language === "hi"
          ? "उच्च स्कोर मतलब सामूहिक मॉडल अपडेट में जोखिम संकेत मौजूद हैं।"
          : "Higher score means collective model update quality may be compromised.",
    },
  };

  return map[moduleName] || map.TransFraud;
}

export default function PrahariPage() {
  const { language: appLanguage } = useLanguage();
  const [form, setForm] = useState<FarmerForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);

  const uiLang = form.language === "hi" || appLanguage === "hi" ? "hi" : "en";

  const labels = useMemo(
    () =>
      uiLang === "hi"
        ? {
            pageTitle: "PRAHARI किसान सुरक्षा स्कोर",
            pageSub:
              "किसान-उन्मुख रियल-टाइम जोखिम जांच: भुगतान सुरक्षा, पहचान सुरक्षा और धोखाधड़ी जोखिम।",
            checkButton: "जोखिम स्कोर जांचें",
            checking: "जांच हो रही है...",
            riskDecision: "अंतिम निर्णय",
            fusedScore: "कुल जोखिम स्कोर",
            howWorks: "यह कैसे काम करता है",
            how1: "लेनदेन, KYC, व्यवहार और बैंक फेडरेशन संकेत मिलाकर जांच होती है।",
            how2: "हर मॉड्यूल का अलग स्कोर दिखता है ताकि कारण समझ आए।",
            how3: "अंत में ALLOW / STEP_UP / BLOCK निर्णय मिलता है।",
          }
        : {
            pageTitle: "PRAHARI Farmer Safety Score",
            pageSub:
              "Farmer-first real-time risk check for payments, identity safety, and fraud prevention.",
            checkButton: "Check Risk Score",
            checking: "Scoring...",
            riskDecision: "Final Decision",
            fusedScore: "Overall Risk Score",
            scoreGuideTitle: "How To Read Scores",
            scoreGuideDetail:
              "Each risk score is from 0-100. Lower is safer. Higher means stronger risk indicators from that module.",
            confidenceGuide:
              "Confidence shows model certainty (0-1). Higher confidence means the engine had stronger signal quality.",
            impactTitle: "What This Means For Users",
            impactLow:
              "Low risk: continue with normal flow and lightweight monitoring.",
            impactModerate:
              "Moderate risk: perform extra verification (OTP, document, callback).",
            impactHigh:
              "High risk: hold transaction/action and trigger manual review.",
            howWorks: "How This Works",
            how1: "Combines transaction, KYC, behavior, and federated banking signals.",
            how2: "Shows each module score separately so the reason is transparent.",
            how3: "Returns ALLOW / STEP_UP / BLOCK decision for easy action.",
          },
    [uiLang],
  );

  async function onSubmit() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const payload = buildPayload(form);
      const response = await fetch("/api/prahari/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errPayload = (await response.json()) as {
          error?: string;
          details?: string[] | string;
        };
        const detailText = Array.isArray(errPayload.details)
          ? errPayload.details.join("; ")
          : errPayload.details || "Unknown API error";
        throw new Error(`${errPayload.error || "Request failed"}: ${detailText}`);
      }

      const json = (await response.json()) as ApiResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-cyan-50 via-emerald-50 to-amber-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="border-cyan-200 bg-white/80">
          <CardHeader>
            <CardTitle className="text-2xl">{labels.pageTitle}</CardTitle>
            <CardDescription>{labels.pageSub}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Farmer Name</label>
              <Input
                value={form.farmerName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, farmerName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.language}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, language: e.target.value as "en" | "hi" }))
                }
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly UPI Transactions</label>
              <Input
                type="number"
                min={5}
                max={80}
                value={form.monthlyTxnCount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monthlyTxnCount: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Average Transaction (INR)</label>
              <Input
                type="number"
                min={100}
                max={120000}
                value={form.avgTxnAmount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    avgTxnAmount: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Odd-Hour Transaction Ratio (0-1)</label>
              <Input
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={form.oddHourRatio}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    oddHourRatio: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Known Fraud Links</label>
              <Input
                type="number"
                min={0}
                max={12}
                value={form.knownFraudLinks}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    knownFraudLinks: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shared Account Cluster Size</label>
              <Input
                type="number"
                min={1}
                max={8}
                value={form.sharedAccountCount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sharedAccountCount: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">KYC Integrity (0-1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.kycIntegrity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    kycIntegrity: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Face Authenticity (0-1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.faceAuthenticity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    faceAuthenticity: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Behavior Shift (0-1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.behaviorShift}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    behaviorShift: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Suspicious Bank Client Ratio (0-1)</label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.suspiciousClientRatio}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    suspiciousClientRatio: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <Button className="w-full" onClick={onSubmit} disabled={loading}>
                {loading ? labels.checking : labels.checkButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50/70">
            <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        {data ? (
          <>
            <Card className="border-zinc-200 bg-white/80">
              <CardHeader>
                <CardTitle>{labels.riskDecision}</CardTitle>
                <CardDescription>
                  {labels.fusedScore}: {data.fusedRiskScore.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className={`text-xl font-semibold ${scoreColor(data.fusedRiskScore)}`}>
                  {data.riskDecision}
                </p>
                <div
                  className={`rounded-md border p-3 text-sm ${riskBand(data.fusedRiskScore, uiLang).bg}`}
                >
                  <p className={`font-semibold ${riskBand(data.fusedRiskScore, uiLang).color}`}>
                    {riskBand(data.fusedRiskScore, uiLang).label}
                  </p>
                  <p className="mt-1 text-zinc-700">
                    {riskBand(data.fusedRiskScore, uiLang).meaning}
                  </p>
                </div>
                <p className="text-sm text-zinc-600">
                  {data.result.fused.reasonCodes.join(" | ")}
                </p>
                <p className="text-xs text-zinc-600">
                  {labels.confidenceGuide} Current fused confidence: {(data.result.fused.confidence * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white/80">
              <CardHeader>
                <CardTitle>{labels.scoreGuideTitle}</CardTitle>
                <CardDescription>{labels.scoreGuideDetail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-700">
                <p>0-44: Low risk range</p>
                <p>45-69: Moderate risk range</p>
                <p>70-100: High risk range</p>
                <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-medium">{labels.impactTitle}</p>
                  <p className="mt-1">{labels.impactLow}</p>
                  <p>{labels.impactModerate}</p>
                  <p>{labels.impactHigh}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["TransFraud", data.result.transFraud],
                ["GhostNet", data.result.ghostNet],
                ["DeepShield", data.result.deepShield],
                ["BioSentinel", data.result.bioSentinel],
                ["FedShield", data.result.fedShield],
              ].map(([name, module]) => (
                <Card key={name} className="bg-white/80">
                  <CardHeader>
                    <CardTitle className="text-base">{name}</CardTitle>
                    <CardDescription>
                      Risk: {module.riskScore.toFixed(2)} | Confidence: {(module.confidence * 100).toFixed(1)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-zinc-600">
                    <p className="font-medium text-zinc-800">
                      {moduleExplanation(name, uiLang).title}
                    </p>
                    <p>{moduleExplanation(name, uiLang).checks}</p>
                    <p>{moduleExplanation(name, uiLang).usage}</p>
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-2">
                      <p>
                        {uiLang === "hi" ? "वर्तमान अर्थ:" : "Current interpretation:"} {riskBand(module.riskScore, uiLang).label}
                      </p>
                      <p>
                        {uiLang === "hi" ? "मॉडल भरोसा:" : "Model certainty:"} {(module.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <p>{module.reasonCodes.join(" | ")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle>{labels.howWorks}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>1. {labels.how1}</p>
            <p>2. {labels.how2}</p>
            <p>3. {labels.how3}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
