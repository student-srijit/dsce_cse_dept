import { NextRequest } from "next/server";

export type RateLimitScope = "apply" | "review";

interface RateLimitConfig {
  windowMs: number;
  maxApply: number;
  maxReview: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  status: 200 | 429 | 503;
  error?: string;
  retryAfterSeconds?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function parsePositiveIntegerEnv(name: string): number {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`${name} is required.`);
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function readRateLimitConfig(): RateLimitConfig {
  return {
    windowMs: parsePositiveIntegerEnv("GRAMCREDIT_RATE_LIMIT_WINDOW_MS"),
    maxApply: parsePositiveIntegerEnv("GRAMCREDIT_RATE_LIMIT_MAX_APPLY"),
    maxReview: parsePositiveIntegerEnv("GRAMCREDIT_RATE_LIMIT_MAX_REVIEW"),
  };
}

export function resolveRequesterKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function checkRateLimit(
  scope: RateLimitScope,
  requesterKey: string,
): RateLimitResult {
  let config: RateLimitConfig;
  try {
    config = readRateLimitConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      allowed: false,
      status: 503,
      error: `Rate limiter is not configured: ${message}`,
    };
  }

  const now = Date.now();
  const limit = scope === "apply" ? config.maxApply : config.maxReview;
  const storeKey = `${scope}:${requesterKey}`;

  const existing = rateLimitStore.get(storeKey);
  const activeEntry: RateLimitEntry =
    !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + config.windowMs }
      : existing;

  if (activeEntry.count >= limit) {
    return {
      allowed: false,
      status: 429,
      error: `Rate limit exceeded for '${scope}'.`,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((activeEntry.resetAt - now) / 1000),
      ),
    };
  }

  activeEntry.count += 1;
  rateLimitStore.set(storeKey, activeEntry);

  return {
    allowed: true,
    status: 200,
  };
}
