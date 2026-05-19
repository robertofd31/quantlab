import { calculateReturns, calculateAnnualizedReturn, calculateAnnualizedVolatility, type PricePoint } from './statistics';

export interface KellyResult {
  fullKelly: number;
  threeQuarterKelly: number;
  halfKelly: number;
  quarterKelly: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  regime: string;
  regimeColor: string;
}

export function calculateKelly(prices: PricePoint[], riskFreeRate: number = 0.02): KellyResult {
  const returns = calculateReturns(prices);
  const annReturn = calculateAnnualizedReturn(returns);
  const annVol = calculateAnnualizedVolatility(returns);
  const variance = annVol * annVol;

  const excessReturn = annReturn - riskFreeRate;
  const fullKelly = variance === 0 ? 0 : excessReturn / variance;
  const clampedFullKelly = Math.min(Math.max(fullKelly, -2), 5);

  return {
    fullKelly: clampedFullKelly,
    threeQuarterKelly: clampedFullKelly * 0.75,
    halfKelly: clampedFullKelly * 0.5,
    quarterKelly: clampedFullKelly * 0.25,
    annualizedReturn: annReturn * 100,
    annualizedVolatility: annVol * 100,
    sharpeRatio: annVol === 0 ? 0 : (annReturn - riskFreeRate) / annVol,
    maxDrawdown: calculateMaxDrawdown(prices),
    regime: getKellyRegime(clampedFullKelly),
    regimeColor: getRegimeColor(clampedFullKelly),
  };
}

function calculateMaxDrawdown(prices: PricePoint[]): number {
  let peak = prices[0].close;
  let maxDD = 0;
  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    const dd = (peak - p.close) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

function getKellyRegime(kelly: number): string {
  if (kelly > 3) return 'VERY AGGRESSIVE';
  if (kelly > 2) return 'AGGRESSIVE';
  if (kelly > 1) return 'MODERATE';
  if (kelly > 0.5) return 'CONSERVATIVE';
  if (kelly > 0) return 'DEFENSIVE';
  return 'CASH / SHORT';
}

function getRegimeColor(kelly: number): string {
  if (kelly > 3) return 'text-purple-400';
  if (kelly > 2) return 'text-red-400';
  if (kelly > 1) return 'text-yellow-400';
  if (kelly > 0.5) return 'text-green-400';
  return 'text-gray-400';
}

export interface KellyCurvePoint {
  leverage: number;
  growth: number;
  zone: string;
  zoneColor: string;
}

export function generateKellyCurve(annReturn: number, annVol: number, riskFreeRate: number = 0.02, points: number = 100): KellyCurvePoint[] {
  const excessReturn = annReturn - riskFreeRate;
  const fullKelly = excessReturn / (annVol * annVol);
  const maxLeverage = Math.min(Math.max(fullKelly * 2, 0.5), 5);
  const curve: KellyCurvePoint[] = [];

  for (let i = 0; i <= points; i++) {
    const leverage = (i / points) * maxLeverage;
    const growth = excessReturn * leverage - 0.5 * annVol * annVol * leverage * leverage;

    let zone = '';
    let zoneColor = '';
    const leverageRatio = fullKelly > 0 ? leverage / fullKelly : leverage;

    if (leverageRatio < 0.5) {
      zone = 'Underinvesting';
      zoneColor = '#22c55e';
    } else if (leverageRatio < 0.8) {
      zone = 'Optimal Sizing';
      zoneColor = '#06b6d4';
    } else if (leverageRatio < 1.2) {
      zone = 'Optimal';
      zoneColor = '#22c55e';
    } else if (leverageRatio < 1.5) {
      zone = 'High Risk';
      zoneColor = '#eab308';
    } else if (leverageRatio < 2) {
      zone = 'Never Logical';
      zoneColor = '#ef4444';
    } else {
      zone = 'Suicidal';
      zoneColor = '#000000';
    }

    curve.push({ leverage: parseFloat(leverage.toFixed(2)), growth: parseFloat((growth * 100).toFixed(2)), zone, zoneColor });
  }

  return curve;
}
