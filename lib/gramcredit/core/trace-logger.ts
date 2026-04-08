/**
 * GramCredit Trace Logger
 * Structured logging for all processing steps, audit trails, explainability
 */

import { TraceEvent, FullTrace } from "./types";
import { getGramCreditConfig } from "./config";

export class GramCreditTraceLogger {
  private applicationId: string;
  private applicantId: string;
  private events: TraceEvent[] = [];
  private startTime: number;
  private config = getGramCreditConfig();

  constructor(applicationId: string, applicantId: string) {
    this.applicationId = applicationId;
    this.applicantId = applicantId;
    this.startTime = Date.now();
  }

  /**
   * Log an input event (data entering a module)
   */
  public logInput(
    moduleId: string,
    data: Record<string, any>,
    metadata?: { [key: string]: any }
  ): void {
    const timestamp = Date.now();
    this.log("INPUT", moduleId, {
      ...data,
      ...metadata,
    });
  }

  /**
   * Log a processing event (intermediate computation)
   */
  public logProcessing(
    moduleId: string,
    step: string,
    data: Record<string, any>
  ): void {
    this.log("PROCESSING", moduleId, {
      step,
      ...data,
    });
  }

  /**
   * Log an output event (data leaving a module)
   */
  public logOutput(
    moduleId: string,
    data: Record<string, any>,
    duration?: number
  ): void {
    this.log("OUTPUT", moduleId, data, duration);
  }

  /**
   * Log an error event
   */
  public logError(
    moduleId: string,
    error: Error | string,
    context?: Record<string, any>
  ): void {
    const errorMessage =
      typeof error === "string" ? error : error.message;
    this.log("ERROR", moduleId, context || {}, undefined, errorMessage);
  }

  /**
   * Log a validation event
   */
  public logValidation(
    moduleId: string,
    passed: boolean,
    reason: string,
    data?: Record<string, any>
  ): void {
    this.log("VALIDATION", moduleId, {
      passed,
      reason,
      ...data,
    });
  }

  /**
   * Internal logging method
   */
  private log(
    eventType: "INPUT" | "PROCESSING" | "OUTPUT" | "ERROR" | "VALIDATION",
    moduleId: string,
    data: Record<string, any>,
    duration?: number,
    errorMessage?: string
  ): void {
    if (this.config.logging.enableTraces === false) {
      return; // Traces disabled
    }

    const timestamp = Date.now();
    const event: TraceEvent = {
      moduleId,
      eventType,
      timestamp,
      data: this.sanitizeData(data),
      duration,
    };

    if (errorMessage) {
      event.errorMessage = errorMessage;
    }

    this.events.push(event);

    // Console logging based on log level
    if (this.shouldLog(eventType)) {
      this.consoleLog(event);
    }
  }

  /**
   * Check if event should be logged to console based on log level
   */
  private shouldLog(eventType: string): boolean {
    const logLevel = this.config.logging.logLevel || "info";
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const eventLevelMap: Record<string, number> = {
      INPUT: 0,
      PROCESSING: 0,
      OUTPUT: 1,
      VALIDATION: 1,
      ERROR: 3,
    };

    return (eventLevelMap[eventType] || 1) >= levels[logLevel];
  }

  /**
   * Console log with structured format
   */
  private consoleLog(event: TraceEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const prefix = `[GramCredit:${event.moduleId}] ${timestamp}`;

    switch (event.eventType) {
      case "ERROR":
        console.error(`${prefix} ERROR:`, event.errorMessage, event.data);
        break;
      case "OUTPUT":
        console.log(`${prefix} OUTPUT:`, event.data);
        break;
      case "VALIDATION":
        const validationMsg = event.data.passed
          ? "VALIDATION PASS"
          : "VALIDATION FAIL";
        console.log(`${prefix} ${validationMsg}:`, event.data.reason);
        break;
      default:
        // DEBUG level only in development
        if (process.env.NODE_ENV === "development") {
          console.debug(`${prefix} ${event.eventType}:`, event.data);
        }
    }
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitive = ["password", "apiKey", "secret", "token"];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Get all events collected so far
   */
  public getEvents(): TraceEvent[] {
    return [...this.events];
  }

  /**
   * Build complete trace object
   */
  public buildTrace(finalDecision: {
    gramScore: number;
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    attributions: any[];
    explanation: Record<string, string>;
  }): FullTrace {
    return {
      applicantId: this.applicantId,
      applicationId: this.applicationId,
      timestamp: Date.now(),
      events: this.events,
      finalDecision,
      requestMetadata: {
        // Can be enriched with request context later
      },
    };
  }

  /**
   * Persist trace to database (if configured)
   */
  public async persistTrace(trace: FullTrace): Promise<void> {
    if (!this.config.logging.persistToDatabase) {
      return;
    }

    if (!this.config.logging.databaseUrl) {
      console.warn("Database persistence enabled but no database URL configured");
      return;
    }

    try {
      // This would typically be implemented with a database client
      // For now, we'll just log the intent
      console.log(
        `[GramCredit:Persistence] Would persist trace ${trace.applicationId} to database`
      );

      // Example implementation with pg:
      // const client = new Client({ connectionString: this.config.logging.databaseUrl });
      // await client.connect();
      // await client.query(
      //   'INSERT INTO gramcredit_traces (application_id, applicant_id, trace_data) VALUES ($1, $2, $3)',
      //   [trace.applicationId, trace.applicantId, JSON.stringify(trace)]
      // );
      // await client.end();
    } catch (error) {
      console.error("Failed to persist trace:", error);
      throw error;
    }
  }
}

/**
 * Utility: Create a new trace logger for an application
 */
export function createTraceLogger(
  applicationId: string,
  applicantId: string
): GramCreditTraceLogger {
  return new GramCreditTraceLogger(applicationId, applicantId);
}
