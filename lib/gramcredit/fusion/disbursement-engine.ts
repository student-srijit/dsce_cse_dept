/**
 * Disbursement Engine
 * Calculates loan terms: amount, tenure, interest rate, repayment schedule
 */

import { GramCreditTraceLogger } from "../core/trace-logger";
import type {
  DecisionOutput,
  DisbursementDetails,
  RepaymentInstallment,
  ApplicationRequest,
} from "../core/types";
import { getGramCreditConfig } from "../core/config";
import { logModuleProcessing } from "../core/module-utils";

/**
 * Calculate disbursement details for approved loan
 */
export async function calculateDisbursement(
  decision: DecisionOutput,
  request: ApplicationRequest,
  logger: GramCreditTraceLogger
): Promise<DisbursementDetails | null> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    if (decision.decision !== "APPROVED") {
      logger.logInput("disbursement_engine", {
        status: "skipped_non_approved",
        decision: decision.decision,
      });
      return null;
    }

    logger.logInput("disbursement_engine", {
      approvedAmount: decision.approvedAmount,
      gramScore: decision.gramScore,
      requestedAmount: request.loanRequest.amount,
      loanCategory: decision.loanCategory,
    });

    // ========== Find Applicable Loan Band ==========
    const loanBand = config.disbursement.loanBands.find(
      (band) =>
        decision.gramScore >= band.scoreMin &&
        decision.gramScore < band.scoreMax
    );

    if (!loanBand) {
      // Fallback to highest matching band
      const matchingBand = config.disbursement.loanBands.filter(
        (band) => decision.gramScore >= band.scoreMin
      );
      if (matchingBand.length === 0) {
        throw new Error("No applicable loan band found");
      }
      var band = matchingBand[matchingBand.length - 1];
    } else {
      var band = loanBand;
    }

    logModuleProcessing(logger, "disbursement_engine", "loan_band_selected", {
      scoreMin: band.scoreMin,
      scoreMax: band.scoreMax,
      maxAmount: band.maxAmount,
      tenure: band.tenure,
      interestRate: band.interestRate,
    });

    // ========== Determine Loan Amount ==========
    // Actual approved amount is min of: decision amount, requested amount, band max
    const loanAmount = Math.min(
      decision.approvedAmount,
      request.loanRequest.amount,
      band.maxAmount
    );

    // ========== Determine Tenure ==========
    // Override with request if reasonable, otherwise use band default
    let tenure = band.tenure;
    if (
      request.loanRequest.tenureMonths &&
      request.loanRequest.tenureMonths >= 6 &&
      request.loanRequest.tenureMonths <= 36
    ) {
      tenure = Math.min(request.loanRequest.tenureMonths, band.tenure);
    }

    // ========== Determine Interest Rate ==========
    // Base rate from band, potentially adjusted by score
    let interestRate = band.interestRate;

    // Slight reduction for very high scores
    if (decision.gramScore >= 90) {
      interestRate = Math.max(
        band.interestRate - 1,
        10 // floor at 10% p.a.
      );
    } else if (decision.gramScore >= 80) {
      interestRate = Math.max(band.interestRate - 0.5, 10);
    }

    logModuleProcessing(logger, "disbursement_engine", "terms_determined", {
      loanAmount,
      tenure,
      interestRate,
      gramScore: decision.gramScore,
    });

    // ========== Calculate Repayment Schedule ==========
    const schedule = generateRepaymentSchedule(
      loanAmount,
      interestRate,
      tenure,
      config.disbursement.repaymentSchedule
    );

    logModuleProcessing(logger, "disbursement_engine", "schedule_generated", {
      scheduleLength: schedule.length,
      monthlyPayment: schedule.length > 0 ? schedule[0].dueAmount : 0,
      totalPayable: schedule.reduce((sum, inst) => sum + inst.dueAmount, 0),
    });

    const totalPayable = schedule.reduce((sum, inst) => sum + inst.dueAmount, 0);
    const monthlyPayment =
      schedule.length > 0 ? schedule[0].dueAmount : 0;

    const disbursement: DisbursementDetails = {
      loanAmount,
      disbursementDate: new Date().toISOString().split("T")[0],
      tenureMonths: tenure,
      interestRateAnnual: interestRate,
      monthlyPayment,
      totalPayable,
      repaymentSchedule: schedule,
      repaymentFrequency: config.disbursement.repaymentSchedule,
      latePaymentPenalty: config.disbursement.latePaymentPenalty,
    };

    logModuleProcessing(
      logger,
      "disbursement_engine",
      "disbursement_complete",
      {
        loanAmount: disbursement.loanAmount,
        monthlyPayment: disbursement.monthlyPayment,
        totalPayable: disbursement.totalPayable,
      },
      Date.now() - startTime
    );

    return disbursement;
  } catch (error) {
    logger.logError("disbursement_engine", error);
    throw error;
  }
}

// ========== Repayment Schedule Generation ==========

/**
 * Generate repayment installment schedule
 * Uses amortization formula for accurate principal/interest splits
 */
function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  frequency: "weekly" | "bi-weekly" | "monthly"
): RepaymentInstallment[] {
  const schedule: RepaymentInstallment[] = [];

  // Convert annual rate to period rate based on frequency
  const periodsPerYear =
    frequency === "weekly" ? 52 : frequency === "bi-weekly" ? 26 : 12;
  const periodRate = annualRate / 100 / periodsPerYear;

  // Calculate number of periods
  const periods =
    frequency === "weekly"
      ? Math.ceil((tenureMonths * 365) / 7)
      : frequency === "bi-weekly"
        ? Math.ceil((tenureMonths * 365) / 14)
        : tenureMonths;

  // EMI formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const numerator = periodRate * Math.pow(1 + periodRate, periods);
  const denominator = Math.pow(1 + periodRate, periods) - 1;
  const emi = principal * (numerator / denominator);

  let remainingBalance = principal;

  for (let i = 1; i <= periods; i++) {
    const interestPayment = remainingBalance * periodRate;
    const principalPayment = emi - interestPayment;

    const dueDate = calculateDueDate(i, frequency);

    schedule.push({
      installmentNumber: i,
      dueDate,
      dueAmount: Math.round(emi * 100) / 100, // Round to nearest paisa
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
    });

    remainingBalance -= principalPayment;
  }

  // Adjust final installment for rounding
  if (schedule.length > 0) {
    const totalPaid = schedule.reduce((sum, inst) => sum + inst.dueAmount, 0);
    const final = schedule[schedule.length - 1];
    final.dueAmount = principal * (1 + (annualRate / 100) * (tenureMonths / 12)) - (totalPaid - final.dueAmount);
  }

  return schedule;
}

/**
 * Calculate due date for installment
 */
function calculateDueDate(
  installmentNumber: number,
  frequency: "weekly" | "bi-weekly" | "monthly"
): string {
  const dueDate = new Date();

  if (frequency === "weekly") {
    dueDate.setDate(dueDate.getDate() + installmentNumber * 7);
  } else if (frequency === "bi-weekly") {
    dueDate.setDate(dueDate.getDate() + installmentNumber * 14);
  } else {
    dueDate.setMonth(dueDate.getMonth() + installmentNumber);
  }

  return dueDate.toISOString().split("T")[0];
}

// ========== Utilities ==========

/**
 * Calculate total interest payable
 */
export function calculateTotalInterest(disbursement: DisbursementDetails): number {
  return disbursement.totalPayable - disbursement.loanAmount;
}

/**
 * Calculate effective annual rate (accounts for compounding)
 */
export function calculateEffectiveAnnualRate(
  disbursement: DisbursementDetails
): number {
  const totalInterest = calculateTotalInterest(disbursement);
  const years = disbursement.tenureMonths / 12;
  return ((totalInterest / disbursement.loanAmount) * 100) / years;
}

/**
 * Get user-friendly repayment summary
 */
export function getRepaymentSummary(disbursement: DisbursementDetails): string {
  const totalInterest = calculateTotalInterest(disbursement);

  return `
Loan Amount: ₹${disbursement.loanAmount.toLocaleString("en-IN")}
Tenure: ${disbursement.tenureMonths} months (${Math.round(disbursement.tenureMonths / 12)} years)
Interest Rate: ${disbursement.interestRateAnnual}% p.a.
Monthly Payment: ₹${Math.round(disbursement.monthlyPayment).toLocaleString("en-IN")}
Total Interest: ₹${Math.round(totalInterest).toLocaleString("en-IN")}
Total Payable: ₹${Math.round(disbursement.totalPayable).toLocaleString("en-IN")}
Payment Frequency: ${disbursement.repaymentFrequency}
Late Payment Penalty: ${Math.round(disbursement.latePaymentPenalty * 100)}% per installment
`;
}
