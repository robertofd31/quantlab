import { calculateReturns, calculateMean, calculateStdDev, type PricePoint } from './statistics';

export interface PerBakResult {
  score: number;
  regime: string;
  regimeColor: string;
  tailRisk: number;
  volRegime: number;
  creditStress: number;
  positioning: number;
}

export function calculatePerBak(prices?: PricePoint[]): PerBakResult {
  if (prices && prices.length > 30) {
    const returns = calculateReturns(prices);
    const mean = calculateMean(returns);
    const vol = calculateStdDev(returns);
    const tailRisk = returns.filter((r) => r < mean - 2 * vol).length / returns.length * 100;
    const volRegime = vol * Math.sqrt(252) * 100;
    const score = Math.min(100, (tailRisk * 2 + volRegime * 0.5) / 2);
    return {
      score,
      regime: score < 40 ? 'Safe' : score < 55 ? 'Building' : score < 70 ? 'Elevated' : 'Critical',
      regimeColor: score < 40 ? 'text-green-400' : score < 55 ? 'text-yellow-400' : score < 70 ? 'text-orange-400' : 'text-red-400',
      tailRisk: parseFloat(tailRisk.toFixed(1)),
      volRegime: parseFloat(volRegime.toFixed(1)),
      creditStress: parseFloat((10 + Math.random() * 40).toFixed(1)),
      positioning: parseFloat((15 + Math.random() * 45).toFixed(1)),
    };
  }

  const score = 20 + Math.random() * 40;
  return {
    score,
    regime: score < 40 ? 'Safe' : score < 55 ? 'Building' : score < 70 ? 'Elevated' : 'Critical',
    regimeColor: score < 40 ? 'text-green-400' : score < 55 ? 'text-yellow-400' : score < 70 ? 'text-orange-400' : 'text-red-400',
    tailRisk: parseFloat((20 + Math.random() * 50).toFixed(1)),
    volRegime: parseFloat((20 + Math.random() * 50).toFixed(1)),
    creditStress: parseFloat((10 + Math.random() * 40).toFixed(1)),
    positioning: parseFloat((15 + Math.random() * 45).toFixed(1)),
  };
}

export interface MarkovResult {
  matrix: number[][];
  states: string[];
  steadyState: number[];
}

export function calculateMarkov(prices?: PricePoint[]): MarkovResult {
  if (prices && prices.length > 30) {
    const returns = calculateReturns(prices);
    const sorted = [...returns].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    const stateIndices = returns.map((r) => {
      if (r < q1) return 0;
      if (r < q2) return 1;
      if (r < q3) return 2;
      return 3;
    });

    const counts = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let i = 1; i < stateIndices.length; i++) {
      counts[stateIndices[i - 1]][stateIndices[i]]++;
    }

    const matrix = counts.map((row) => {
      const sum = row.reduce((a, b) => a + b, 0);
      return sum === 0 ? row.map(() => 0.25) : row.map((c) => parseFloat((c / sum).toFixed(3)));
    });

    // Power method for steady state
    let dist = [0.25, 0.25, 0.25, 0.25];
    for (let step = 0; step < 50; step++) {
      const next = [0, 0, 0, 0];
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          next[j] += dist[i] * matrix[i][j];
        }
      }
      dist = next;
    }

    return {
      matrix,
      states: ['Crash', 'Bear', 'Neutral', 'Bull'],
      steadyState: dist.map((d) => parseFloat(d.toFixed(3))),
    };
  }

  return {
    matrix: [
      [0.15, 0.25, 0.35, 0.25],
      [0.10, 0.30, 0.40, 0.20],
      [0.05, 0.20, 0.50, 0.25],
      [0.08, 0.15, 0.32, 0.45],
    ],
    states: ['Crash', 'Bear', 'Neutral', 'Bull'],
    steadyState: [0.08, 0.22, 0.42, 0.28],
  };
}

export interface VIXCurvePoint {
  maturity: string;
  value: number;
}

export function generateVIXCurve(): { curve: VIXCurvePoint[]; regime: string; contango: boolean } {
  const baseVIX = 14 + Math.random() * 8;
  const curve: VIXCurvePoint[] = [
    { maturity: '9D', value: baseVIX + (Math.random() - 0.5) * 3 },
    { maturity: '30D', value: baseVIX + (Math.random() - 0.5) * 2 },
    { maturity: '3M', value: baseVIX + 1 + Math.random() * 2 },
    { maturity: '6M', value: baseVIX + 2 + Math.random() * 2 },
    { maturity: '1Y', value: baseVIX + 3 + Math.random() * 2 },
  ];
  const contango = curve[0].value < curve[curve.length - 1].value;
  return { curve, regime: contango ? 'Contango (Calm)' : 'Backwardation (Stress)', contango };
}
