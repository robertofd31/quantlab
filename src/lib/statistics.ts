export interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

export function calculateReturns(prices: PricePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
  }
  return returns;
}

export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function calculateStdDev(arr: number[]): number {
  const mean = calculateMean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export function calculateAnnualizedReturn(returns: number[], tradingDays: number = 252): number {
  return calculateMean(returns) * tradingDays;
}

export function calculateAnnualizedVolatility(returns: number[], tradingDays: number = 252): number {
  return calculateStdDev(returns) * Math.sqrt(tradingDays);
}

export function calculateMaxDrawdown(prices: PricePoint[]): number {
  let peak = prices[0].close;
  let maxDD = 0;
  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    const dd = (peak - p.close) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

export function percentile(arr: number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function skewness(arr: number[]): number {
  const mean = calculateMean(arr);
  const n = arr.length;
  const m3 = arr.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0) / n;
  const m2 = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  return m3 / Math.pow(m2, 1.5);
}

export function kurtosis(arr: number[]): number {
  const mean = calculateMean(arr);
  const n = arr.length;
  const m4 = arr.reduce((sum, val) => sum + Math.pow(val - mean, 4), 0) / n;
  const m2 = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  return m4 / (m2 * m2) - 3;
}

export function linreg(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = sumY2 - intercept * sumY - slope * sumXY;
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}
