"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  useLanguage,
  type SupportedLanguage,
} from "@/components/language/language-provider";

interface DisbursementDetails {
  loanBand: "MICRO" | "MINI" | "STANDARD";
  approvedAmount: number;
  interestRateAnnual: number;
  tenureMonths: number;
  monthlyPayment: number;
  totalRepayment: number;
  repaymentSchedule: Array<{
    month: number;
    principal: number;
    interest: number;
    payment: number;
    balance: number;
  }>;
}

interface DecisionCardProps {
  decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  gramScore: number;
  approvedAmount?: number;
  disbursement?: DisbursementDetails;
  explanation?: string;
}

export function DecisionCard({
  decision,
  gramScore,
  approvedAmount,
  disbursement,
  explanation,
}: DecisionCardProps) {
  const { language } = useLanguage();

  const translate = (
    en: string,
    hi: string,
    ta: string,
    te: string,
    kn: string,
  ) => {
    const mapping: Record<SupportedLanguage, string> = { en, hi, ta, te, kn };
    return mapping[language] || en;
  };

  const getDecisionIcon = () => {
    switch (decision) {
      case "APPROVED":
        return <CheckCircle2 className="w-12 h-12 text-green-600" />;
      case "REJECTED":
        return <XCircle className="w-12 h-12 text-red-600" />;
      case "UNDER_REVIEW":
        return <Clock className="w-12 h-12 text-yellow-600" />;
    }
  };

  const getDecisionColor = () => {
    switch (decision) {
      case "APPROVED":
        return "bg-green-50 border-green-200";
      case "REJECTED":
        return "bg-red-50 border-red-200";
      case "UNDER_REVIEW":
        return "bg-yellow-50 border-yellow-200";
    }
  };

  const getDecisionText = () => {
    switch (decision) {
      case "APPROVED":
        return translate("Loan Approved", "ऋण स्वीकृत", "கடன் அங்கீகரிக்கப்பட்டது", "రుణం ఆమోదించబడింది", "ಸಾಲ ಮಂಜೂರಾಯಿತು");
      case "REJECTED":
        return translate("Application Not Approved", "आवेदन स्वीकृत नहीं हुआ", "விண்ணப்பம் அங்கீகரிக்கப்படவில்லை", "అప్లికేషన్ ఆమోదించబడలేదు", "ಅರ್ಜಿ ಮಂಜೂರಾಗಿಲ್ಲ");
      case "UNDER_REVIEW":
        return translate("Under Review", "समीक्षा में", "மதிப்பாய்வில் உள்ளது", "సమీక్షలో ఉంది", "ಪರಿಶೀಲನೆಯಲ್ಲಿ ಇದೆ");
    }
  };

  const getDecisionTextColor = () => {
    switch (decision) {
      case "APPROVED":
        return "text-green-700";
      case "REJECTED":
        return "text-red-700";
      case "UNDER_REVIEW":
        return "text-yellow-700";
    }
  };

  return (
    <Card className={`p-8 border-2 ${getDecisionColor()}`}>
      <div className="space-y-6">
        {/* Decision Header */}
        <div className="flex items-center gap-4">
          {getDecisionIcon()}
          <div>
            <h2 className={`text-2xl font-bold ${getDecisionTextColor()}`}>
              {getDecisionText()}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">GramScore: {gramScore.toFixed(1)}/100</p>
          </div>
        </div>

        {/* Approved Details */}
        {decision === "APPROVED" && disbursement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-muted-foreground">{translate("Approved Amount", "स्वीकृत राशि", "அங்கீகரிக்கப்பட்ட தொகை", "ఆమోదించిన మొత్తం", "ಮಂಜೂರಾದ ಮೊತ್ತ")}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{disbursement.approvedAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-muted-foreground">{translate("Monthly Payment", "मासिक भुगतान", "மாதாந்திர கட்டணம்", "నెలవారీ చెల్లింపు", "ತಿಂಗಳ ಪಾವತಿ")}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{disbursement.monthlyPayment.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">{translate("Tenure", "अवधि", "காலம்", "కాలవ్యవధి", "ಅವಧಿ")}</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.tenureMonths} {translate("months", "महीने", "மாதங்கள்", "నెలలు", "ತಿಂಗಳು")}</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">{translate("Interest Rate", "ब्याज दर", "வட்டி விகிதம்", "వడ్డీ రేటు", "ಬಡ್ಡಿದರ")}</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.interestRateAnnual.toFixed(1)}% {translate("p.a.", "प्रति वर्ष", "வருடத்திற்கு", "ప్రతి సంవత్సరం", "ಪ್ರತಿ ವರ್ಷ")}</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">{translate("Loan Category", "ऋण श्रेणी", "கடன் வகை", "రుణ వర్గం", "ಸಾಲ ವರ್ಗ")}</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.loanBand}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-green-100">
              <p className="text-sm text-muted-foreground">{translate("Total Repayment Amount", "कुल चुकौती राशि", "மொத்த திருப்பிச் செலுத்தல்", "మొత్తం తిరిగి చెల్లింపు", "ಒಟ್ಟು ಮರುಪಾವತಿ ಮೊತ್ತ")}</p>
              <p className="text-xl font-bold text-foreground mt-2">
                ₹{disbursement.totalRepayment.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {translate("Interest", "ब्याज", "வட்டி", "వడ్డీ", "ಬಡ್ಡಿ")}: ₹{(disbursement.totalRepayment - disbursement.approvedAmount).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold text-sm text-foreground mb-2">{translate("About Your Decision", "आपके निर्णय के बारे में", "உங்கள் முடிவைப் பற்றி", "మీ నిర్ణయం గురించి", "ನಿಮ್ಮ ನಿರ್ಧಾರದ ಬಗ್ಗೆ")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
          </div>
        )}

        {/* Rejection Message */}
        {decision === "REJECTED" && (
          <div className="p-4 bg-white rounded-lg border border-red-100">
            <p className="text-sm text-red-700">
              {explanation ||
                translate(
                  "Your application does not meet the minimum eligibility criteria at this time. Please contact our support team for more information.",
                  "इस समय आपका आवेदन न्यूनतम पात्रता मानदंड पूरा नहीं करता। अधिक जानकारी के लिए सहायता टीम से संपर्क करें।",
                  "இந்த நேரத்தில் உங்கள் விண்ணப்பம் குறைந்தபட்ச தகுதிகளை பூர்த்தி செய்யவில்லை. மேலும் தகவலுக்கு ஆதரவு குழுவை தொடர்புகொள்ளவும்.",
                  "ఈ సమయంలో మీ అప్లికేషన్ కనీస అర్హతలను తీరడం లేదు. మరింత సమాచారం కోసం మద్దతు బృందాన్ని సంప్రదించండి.",
                  "ಈ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಅರ್ಜಿ ಕನಿಷ್ಠ ಅರ್ಹತಾ ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸಿಲ್ಲ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗೆ ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                )}
            </p>
          </div>
        )}

        {/* Under Review */}
        {decision === "UNDER_REVIEW" && (
          <div className="p-4 bg-white rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700">
              {translate(
                "Your application is being reviewed. We'll notify you of the decision within 24-48 hours.",
                "आपके आवेदन की समीक्षा चल रही है। 24-48 घंटे में निर्णय बताया जाएगा।",
                "உங்கள் விண்ணப்பம் மதிப்பாய்வில் உள்ளது. 24-48 மணி நேரத்தில் முடிவு தெரிவிக்கப்படும்.",
                "మీ అప్లికేషన్ సమీక్షలో ఉంది. 24-48 గంటల్లో నిర్ణయం తెలియజేస్తాము.",
                "ನಿಮ್ಮ ಅರ್ಜಿ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಇದೆ. 24-48 ಗಂಟೆಗಳೊಳಗೆ ನಿರ್ಧಾರ ತಿಳಿಸಲಾಗುತ್ತದೆ.",
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
