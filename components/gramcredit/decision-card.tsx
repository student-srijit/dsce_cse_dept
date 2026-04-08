"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

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
        return "Loan Approved";
      case "REJECTED":
        return "Application Not Approved";
      case "UNDER_REVIEW":
        return "Under Review";
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
                <p className="text-sm text-muted-foreground">Approved Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{disbursement.approvedAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{disbursement.monthlyPayment.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">Tenure</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.tenureMonths} months</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">Interest Rate</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.interestRateAnnual.toFixed(1)}% p.a.</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-100">
                <p className="text-muted-foreground">Loan Category</p>
                <p className="font-semibold text-foreground mt-1">{disbursement.loanBand}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-green-100">
              <p className="text-sm text-muted-foreground">Total Repayment Amount</p>
              <p className="text-xl font-bold text-foreground mt-2">
                ₹{disbursement.totalRepayment.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Interest: ₹{(disbursement.totalRepayment - disbursement.approvedAmount).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold text-sm text-foreground mb-2">About Your Decision</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
          </div>
        )}

        {/* Rejection Message */}
        {decision === "REJECTED" && (
          <div className="p-4 bg-white rounded-lg border border-red-100">
            <p className="text-sm text-red-700">
              {explanation ||
                "Your application does not meet the minimum eligibility criteria at this time. Please contact our support team for more information."}
            </p>
          </div>
        )}

        {/* Under Review */}
        {decision === "UNDER_REVIEW" && (
          <div className="p-4 bg-white rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700">
              Your application is being reviewed. We'll notify you of the decision within 24-48 hours.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
