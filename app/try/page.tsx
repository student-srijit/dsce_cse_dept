"use client";

import { useState } from "react";
import { FarmerProfileForm } from "@/components/gramcredit/farmer-profile-form";
import { VoiceRecorder } from "@/components/gramcredit/voice-recorder";
import { DecisionCard } from "@/components/gramcredit/decision-card";
import { ExplanationCard } from "@/components/gramcredit/explanation-card";
import { Spinner } from "@/components/ui/spinner";

interface ApplicationStep {
  phase: "profile" | "voice" | "processing" | "result";
}

interface ApplicationResult {
  decision: {
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    gramScore: number;
    approvedAmount: number;
    loanCategory: "MICRO" | "MINI" | "STANDARD" | "NONE";
    reasonCodes: string[];
  };
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
  disbursement?: {
    loanAmount: number;
    interestRateAnnual: number;
    tenureMonths: number;
    monthlyPayment: number;
    totalPayable: number;
    repaymentSchedule: Array<{
      installmentNumber: number;
      principal: number;
      interest: number;
      dueAmount: number;
    }>;
  } | null;
  explanation?: Record<string, string>;
  attributions: Array<{
    signalName: string;
    contribution: number;
    direction: "positive" | "negative" | "neutral";
    reasonCode: string;
    confidence: number;
  }>;
}

interface FarmerProfile {
  name: string;
  age: number;
  state: string;
  cropType: string;
  landSizeHectares: number;
  location: {
    lat: number;
    lon: number;
  };
  preferredLanguage: "en" | "hi" | "ta" | "te" | "kn";
}

function reasonCodeToMessage(reasonCode: string): string {
  const mapping: Record<string, string> = {
    VOICE_HIGH_CONSCIENTIOUSNESS:
      "Your voice interview shows strong discipline and planning behavior.",
    VOICE_HIGH_AGREEABLENESS:
      "Your responses suggest high trustworthiness and cooperative behavior.",
    SOCIAL_STRONG_NETWORK:
      "Your village transaction graph shows strong community trust links.",
    SOCIAL_MODERATE_NETWORK:
      "Your social trust network is stable, with room for stronger peer connectivity.",
    SOCIAL_FRAUD_INDICATORS:
      "Your social graph has unusual patterns that need verification.",
    SATELLITE_HEALTHY_CROP:
      "Satellite analysis indicates healthy crop growth in your field.",
    SATELLITE_STRESSED_CROP:
      "Satellite data shows crop stress, which slightly increases repayment risk.",
    BEHAVIOR_HIGH_REGULARITY:
      "Your UPI and recharge behavior is consistent across recent months.",
    BEHAVIOR_LOW_REGULARITY:
      "Your mobile payment behavior appears irregular and affects your score.",
  };

  return mapping[reasonCode] || reasonCode.replaceAll("_", " ").toLowerCase();
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Audio encoding failed"));
        return;
      }

      const payload = result.split(",")[1];
      if (!payload) {
        reject(new Error("Audio payload is empty"));
        return;
      }

      resolve(payload);
    };
    reader.onerror = () => reject(new Error("Failed to read audio file"));
    reader.readAsDataURL(blob);
  });
}

export default function TryPage() {
  const [step, setStep] = useState<ApplicationStep>({ phase: "profile" });
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleProfileSubmit = (profile: FarmerProfile) => {
    setFarmerProfile(profile);
    setStep({ phase: "voice" });
    setError("");
  };

  const handleRecordingComplete = async (blob: Blob) => {
    if (!farmerProfile) {
      setError("Farmer profile is missing. Please start again.");
      setStep({ phase: "profile" });
      return;
    }

    setIsLoading(true);
    setStep({ phase: "processing" });
    setError("");

    try {
      const base64Audio = await blobToBase64(blob);

      const response = await fetch("/api/gramcredit/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmerId: `farmer_${Date.now()}`,
          audioBlob: base64Audio,
          farmerProfile,
          requestedLoanAmount: 50000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const details = Array.isArray(errorData.details)
          ? ` (${errorData.details.join("; ")})`
          : "";
        throw new Error(
          `${errorData.error || "Application processing failed"}${details}`,
        );
      }

      const applicationResult: ApplicationResult = await response.json();
      setResult(applicationResult);
      setStep({ phase: "result" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to process application: ${errorMessage}`);
      setStep({ phase: "voice" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep({ phase: "profile" });
    setFarmerProfile(null);
    setResult(null);
    setError("");
  };

  const selectedLanguage = farmerProfile?.preferredLanguage || "en";
  const topReasons =
    result?.attributions
      .filter((attribution) => attribution.direction === "positive")
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 3)
      .map((attribution) => reasonCodeToMessage(attribution.reasonCode)) || [];

  const improvements =
    result?.attributions
      .filter((attribution) => attribution.direction === "negative")
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 2)
      .map((attribution) => reasonCodeToMessage(attribution.reasonCode)) || [];

  const decisionDisbursement =
    result?.decision.decision === "APPROVED" && result.disbursement
      ? {
          loanBand:
            result.decision.loanCategory === "NONE"
              ? "MICRO"
              : result.decision.loanCategory,
          approvedAmount: result.disbursement.loanAmount,
          interestRateAnnual: result.disbursement.interestRateAnnual,
          tenureMonths: result.disbursement.tenureMonths,
          monthlyPayment: result.disbursement.monthlyPayment,
          totalRepayment: result.disbursement.totalPayable,
          repaymentSchedule: result.disbursement.repaymentSchedule.map(
            (item) => ({
              month: item.installmentNumber,
              principal: item.principal,
              interest: item.interest,
              payment: item.dueAmount,
              balance: 0,
            }),
          ),
        }
      : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-amber-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
            Live Demo
          </p>
          <h1 className="text-4xl font-bold text-foreground">Try GramCredit</h1>
          <p className="text-base text-muted-foreground">
            Complete profile, record voice, and get a loan decision in under two
            minutes.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase !== "profile" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}
          >
            1
          </div>
          <div className="w-8 h-1 bg-gray-300" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase !== "voice" && step.phase !== "profile" ? "bg-green-600 text-white" : step.phase === "voice" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            2
          </div>
          <div className="w-8 h-1 bg-gray-300" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase === "result" ? "bg-green-600 text-white" : step.phase === "processing" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            3
          </div>
        </div>

        {step.phase === "profile" && (
          <FarmerProfileForm
            onSubmit={handleProfileSubmit}
            isLoading={isLoading}
          />
        )}

        {step.phase === "voice" && (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            isLoading={isLoading}
          />
        )}

        {step.phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 rounded-xl border border-emerald-200 bg-white/70">
            <Spinner className="w-12 h-12" />
            <h2 className="text-xl font-semibold text-foreground">
              Processing Your Application
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Analyzing voice psychometrics, social GNN trust graph, satellite
              crop health, and mobile behavior before generating your GramScore.
            </p>
          </div>
        )}

        {step.phase === "result" && result && (
          <div className="space-y-6">
            <DecisionCard
              decision={result.decision.decision}
              gramScore={result.gramScore.score}
              approvedAmount={result.decision.approvedAmount}
              disbursement={decisionDisbursement}
              explanation={
                result.explanation?.[selectedLanguage] || result.explanation?.en
              }
            />

            <ExplanationCard
              gramScore={result.gramScore.score}
              signals={[
                {
                  name: "Voice Interview",
                  score: result.gramScore.signals.voice,
                  confidence:
                    result.attributions.find(
                      (item) => item.signalName === "Voice Interview",
                    )?.confidence || 0.7,
                  contribution: 0.25,
                  direction:
                    result.gramScore.signals.voice >= 50
                      ? "positive"
                      : "negative",
                },
                {
                  name: "Social Trust",
                  score: result.gramScore.signals.social,
                  confidence:
                    result.attributions.find(
                      (item) => item.signalName === "Social Network",
                    )?.confidence || 0.7,
                  contribution: 0.3,
                  direction:
                    result.gramScore.signals.social >= 50
                      ? "positive"
                      : "negative",
                },
                {
                  name: "Crop Health",
                  score: result.gramScore.signals.satellite,
                  confidence:
                    result.attributions.find(
                      (item) => item.signalName === "Crop Health",
                    )?.confidence || 0.7,
                  contribution: 0.3,
                  direction:
                    result.gramScore.signals.satellite >= 50
                      ? "positive"
                      : "negative",
                },
                {
                  name: "Financial Behavior",
                  score: result.gramScore.signals.behavior,
                  confidence:
                    result.attributions.find(
                      (item) => item.signalName === "Mobile Behavior",
                    )?.confidence || 0.7,
                  contribution: 0.15,
                  direction:
                    result.gramScore.signals.behavior >= 50
                      ? "positive"
                      : "negative",
                },
              ]}
              topReasons={topReasons}
              improvements={improvements}
            />

            <button
              onClick={handleReset}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start New Application
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
