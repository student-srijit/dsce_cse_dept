"use client";

import { useEffect, useState } from "react";
import {
  ConsentKycStep,
  type ConsentKycData,
} from "@/components/gramcredit/consent-kyc-step";
import { FarmerProfileForm } from "@/components/gramcredit/farmer-profile-form";
import { VoiceRecorder } from "@/components/gramcredit/voice-recorder";
import { DecisionCard } from "@/components/gramcredit/decision-card";
import { ExplanationCard } from "@/components/gramcredit/explanation-card";
import { Spinner } from "@/components/ui/spinner";
import { useLanguage } from "@/components/language/language-provider";
import {
  pickText,
  reasonCodeText,
  tryPageText,
} from "@/lib/gramcredit/ui-i18n";

interface ApplicationStep {
  phase: "consent" | "profile" | "voice" | "processing" | "result";
}

interface ApplicationResult {
  applicationId: string;
  farmerId: string;
  timestamp: number;
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

interface ApplicationStatusRecord {
  applicationId: string;
  farmerId: string;
  status:
    | "RECEIVED"
    | "PROCESSING"
    | "UNDER_REVIEW"
    | "REVIEW_IN_PROGRESS"
    | "COMPLETED"
    | "FAILED";
  createdAt: number;
  updatedAt: number;
  decision?: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  reason?: string;
}

interface FarmerProfile {
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  mobileNumber: string;
  state: string;
  village: string;
  cropType: string;
  landSizeHectares: number;
  yearsFarming: number;
  annualIncome: number;
  hasIrrigation: boolean;
  hasStorage: boolean;
  pastLoanCount: number;
  landOwnershipType: "owned" | "leased" | "shared";
  requestedLoanAmount: number;
  loanPurpose: string;
  location: {
    lat: number;
    lon: number;
  };
  preferredLanguage: "en" | "hi" | "ta" | "te" | "kn";
}

type InterviewQuestionResponse = {
  questions: string[];
  source: "groq" | "fallback";
  language: string;
};

function reasonCodeToMessage(reasonCode: string, language: FarmerProfile["preferredLanguage"]): string {
  const matched = reasonCodeText[reasonCode];
  if (matched) {
    return pickText(matched, language);
  }

  return reasonCode.replaceAll("_", " ").toLowerCase();
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
  const { language } = useLanguage();
  const [step, setStep] = useState<ApplicationStep>({ phase: "consent" });
  const [consentKyc, setConsentKyc] = useState<ConsentKycData | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const [statusRecord, setStatusRecord] =
    useState<ApplicationStatusRecord | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleConsentSubmit = (payload: ConsentKycData) => {
    setConsentKyc(payload);
    setStep({ phase: "profile" });
    setError("");
  };

  const handleProfileSubmit = (profile: FarmerProfile) => {
    setFarmerProfile(profile);
    setStep({ phase: "voice" });
    setError("");
  };

  useEffect(() => {
    async function generateInterviewQuestions() {
      if (!farmerProfile || step.phase !== "voice") {
        return;
      }
      setQuestionsLoading(true);
      try {
        const response = await fetch("/api/gramcredit/interview-questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            farmerProfile,
            requestedLoanAmount: farmerProfile.requestedLoanAmount,
            loanPurpose: farmerProfile.loanPurpose,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate interview questions");
        }

        const payload = (await response.json()) as InterviewQuestionResponse;
        setInterviewQuestions(payload.questions || []);
      } catch (err) {
        console.error("Interview question generation failed", err);
        setInterviewQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    }

    generateInterviewQuestions();
  }, [farmerProfile, step.phase, language]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (!farmerProfile) {
      setError(pickText(tryPageText.missingProfile, language));
      setStep({ phase: "consent" });
      return;
    }

    if (!consentKyc) {
      setError(pickText(tryPageText.missingKyc, language));
      setStep({ phase: "consent" });
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
          requestedLoanAmount: farmerProfile.requestedLoanAmount,
          loanPurpose: farmerProfile.loanPurpose,
          consent: consentKyc.consent,
          kyc: consentKyc.kyc,
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
      setStatusRecord(null);
      setStep({ phase: "result" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const prefix =
        language === "hi"
          ? "आवेदन प्रोसेस नहीं हो सका"
          : language === "ta"
            ? "விண்ணப்பத்தை செயலாக்க முடியவில்லை"
            : language === "te"
              ? "అప్లికేషన్ ప్రాసెస్ కాలేదు"
              : language === "kn"
                ? "ಅರ್ಜಿಯನ್ನು ಸಂಸ್ಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ"
                : "Failed to process application";
      setError(`${prefix}: ${errorMessage}`);
      setStep({ phase: "voice" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep({ phase: "consent" });
    setConsentKyc(null);
    setFarmerProfile(null);
    setResult(null);
    setStatusRecord(null);
    setInterviewQuestions([]);
    setError("");
  };

  const refreshApplicationStatus = async () => {
    if (!result?.applicationId) {
      return;
    }

    setIsStatusLoading(true);
    try {
      const response = await fetch(
        `/api/gramcredit/status/${result.applicationId}`,
      );
      if (!response.ok) {
        throw new Error(pickText(tryPageText.statusFetchError, language));
      }

      const statusPayload: ApplicationStatusRecord = await response.json();
      setStatusRecord(statusPayload);
    } catch (statusError) {
      const message =
        statusError instanceof Error
          ? statusError.message
          : pickText(tryPageText.statusFetchError, language);
      setError(message);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const selectedLanguage = language;
  const topReasons =
    result?.attributions
      .filter((attribution) => attribution.direction === "positive")
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 3)
      .map((attribution) => reasonCodeToMessage(attribution.reasonCode, selectedLanguage)) || [];

  const improvements =
    result?.attributions
      .filter((attribution) => attribution.direction === "negative")
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 2)
      .map((attribution) => reasonCodeToMessage(attribution.reasonCode, selectedLanguage)) || [];

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
    <main className="min-h-screen bg-linear-to-b from-emerald-50 via-lime-50 to-amber-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
            {pickText(tryPageText.liveDemo, language)}
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {pickText(tryPageText.title, language)}
          </h1>
          <p className="text-base text-muted-foreground">
            {pickText(tryPageText.subtitle, language)}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase !== "consent" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}
          >
            1
          </div>
          <div className="w-8 h-1 bg-gray-300" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase === "voice" || step.phase === "processing" || step.phase === "result" ? "bg-green-600 text-white" : step.phase === "profile" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            2
          </div>
          <div className="w-8 h-1 bg-gray-300" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase === "processing" || step.phase === "result" ? "bg-green-600 text-white" : step.phase === "voice" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            3
          </div>
          <div className="w-8 h-1 bg-gray-300" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step.phase === "result" ? "bg-green-600 text-white" : step.phase === "processing" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            4
          </div>
        </div>

        {step.phase === "consent" && (
          <ConsentKycStep
            onSubmit={handleConsentSubmit}
            isLoading={isLoading}
          />
        )}

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
            interviewQuestions={interviewQuestions}
            questionsLoading={questionsLoading}
          />
        )}

        {step.phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 rounded-xl border border-emerald-200 bg-white/70">
            <Spinner className="w-12 h-12" />
            <h2 className="text-xl font-semibold text-foreground">
              {pickText(tryPageText.processingTitle, language)}
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {pickText(tryPageText.processingDetail, language)}
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
                  name:
                    language === "hi"
                      ? "वॉइस इंटरव्यू"
                      : language === "ta"
                        ? "குரல் நேர்காணல்"
                        : language === "te"
                          ? "వాయిస్ ఇంటర్వ్యూ"
                          : language === "kn"
                            ? "ಧ್ವನಿ ಸಂದರ್ಶನ"
                            : "Voice Interview",
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
                  name:
                    language === "hi"
                      ? "सामाजिक भरोसा"
                      : language === "ta"
                        ? "சமூக நம்பிக்கை"
                        : language === "te"
                          ? "సామాజిక నమ్మకం"
                          : language === "kn"
                            ? "ಸಾಮಾಜಿಕ ನಂಬಿಕೆ"
                            : "Social Trust",
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
                  name:
                    language === "hi"
                      ? "फसल स्वास्थ्य"
                      : language === "ta"
                        ? "பயிர் ஆரோக்கியம்"
                        : language === "te"
                          ? "పంట ఆరోగ్యం"
                          : language === "kn"
                            ? "ಬೆಳೆ ಆರೋಗ್ಯ"
                            : "Crop Health",
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
                  name:
                    language === "hi"
                      ? "वित्तीय व्यवहार"
                      : language === "ta"
                        ? "நிதி நடத்தை"
                        : language === "te"
                          ? "ఆర్థిక ప్రవర్తన"
                          : language === "kn"
                            ? "ಆರ್ಥಿಕ ವರ್ತನೆ"
                            : "Financial Behavior",
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
              {pickText(tryPageText.newApplication, language)}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              {pickText(tryPageText.appId, language)}: {result.applicationId}
            </p>

            <button
              onClick={refreshApplicationStatus}
              className="w-full px-4 py-2 bg-white text-foreground border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={isStatusLoading}
            >
              {isStatusLoading
                ? pickText(tryPageText.checkingStatus, language)
                : pickText(tryPageText.checkStatus, language)}
            </button>

            {statusRecord && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-foreground">
                  {pickText(tryPageText.currentStatus, language)}: {statusRecord.status}
                </p>
                {statusRecord.decision && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {pickText(tryPageText.decision, language)}: {statusRecord.decision}
                  </p>
                )}
                {statusRecord.reason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {pickText(tryPageText.reason, language)}: {statusRecord.reason}
                  </p>
                )}
              </div>
            )}
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
