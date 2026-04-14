export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function toPercent(value: number): number {
  return clamp(value * 100, 0, 100);
}

export function normalizeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return clamp(numerator / denominator, 0, 1);
}

export function weightedAverage(
  values: number[],
  weights: number[],
  fallback: number = 0,
): number {
  if (values.length !== weights.length || values.length === 0) {
    return fallback;
  }
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    weighted += values[i] * weights[i];
    weightSum += weights[i];
  }
  if (weightSum <= 0) {
    return fallback;
  }
  return weighted / weightSum;
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, curr) => acc + curr, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const avg = mean(values);
  const variance =
    values.reduce((acc, curr) => acc + (curr - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
