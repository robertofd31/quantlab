import {
  calculateReturns,
  calculateMean,
  calculateStdDev,
  type PricePoint,
} from './statistics';

export interface OptimizerAsset {
  symbol: string;
  prices: PricePoint[];
}

export interface IndividualKelly {
  symbol: string;
  kelly: number;
  annReturn: number;
  annVol: number;
  sharpe: number;
}

export interface PortfolioCombination {
  symbols: string[];
  weights: number[];
  individualKellys: number[];
  maxIndividualKelly: number;
  nekrasovKelly: number;
  diversificationBonus: number;
  portfolioSharpe: number;
  portfolioAnnReturn: number;
  portfolioAnnVol: number;
  bestDiversifier: string;
  worstDiversifier: string;
  correlationMatrix: number[][];
}

// Matrix inversion via Gaussian elimination
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    let pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-10) {
      // Find row with max pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-10) {
        // Singular matrix, return pseudo-identity
        return matrix.map((row, r) => row.map((_, c) => (r === c ? 1 : 0)));
      }
    }

    for (let j = 0; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (arr.length < k) return;
  if (arr.length === k) {
    yield [...arr];
    return;
  }
  const [first, ...rest] = arr;
  for (const combo of combinations(rest, k - 1)) {
    yield [first, ...combo];
  }
  for (const combo of combinations(rest, k)) {
    yield combo;
  }
}

export function computeIndividualKellys(
  assets: OptimizerAsset[],
  riskFreeRate: number
): IndividualKelly[] {
  return assets.map((a) => {
    const returns = calculateReturns(a.prices);
    const meanReturn = calculateMean(returns);
    const dailyVol = calculateStdDev(returns);
    const annReturn = meanReturn * 252;
    const annVol = dailyVol * Math.sqrt(252);
    const variance = annVol * annVol;
    const kelly = variance === 0 ? 0 : (annReturn - riskFreeRate) / variance;
    const clampedKelly = Math.max(-2, Math.min(kelly, 5));

    return {
      symbol: a.symbol,
      kelly: clampedKelly,
      annReturn: annReturn * 100,
      annVol: annVol * 100,
      sharpe: annVol === 0 ? 0 : (annReturn - riskFreeRate) / annVol,
    };
  });
}

export function runPortfolioOptimizer(
  assets: OptimizerAsset[],
  nAssetsPerPortfolio: number,
  riskFreeRate: number
): { combinations: PortfolioCombination[]; totalChecked: number; individualKellys: IndividualKelly[] } {
  const individualKellys = computeIndividualKellys(assets, riskFreeRate);
  const kellyMap = new Map(individualKellys.map((k) => [k.symbol, k]));

  // Pre-calculate returns for all assets
  const allReturns = assets.map((a) => calculateReturns(a.prices));

  const results: PortfolioCombination[] = [];

  // Limit total combinations to prevent browser freeze
  const MAX_COMBINATIONS = 5000;
  let processed = 0;

  for (const combo of combinations(assets, nAssetsPerPortfolio)) {
    if (processed >= MAX_COMBINATIONS) break;
    processed++;

    const symbols = combo.map((a) => a.symbol);
    const n = combo.length;
    const equalWeight = 1 / n;

    // Build covariance matrix
    const covMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const ri = allReturns[assets.findIndex((a) => a.symbol === symbols[i])];
        const rj = allReturns[assets.findIndex((a) => a.symbol === symbols[j])];
        const mi = calculateMean(ri);
        const mj = calculateMean(rj);
        let sum = 0;
        const len = Math.min(ri.length, rj.length);
        for (let k = 0; k < len; k++) {
          sum += (ri[k] - mi) * (rj[k] - mj);
        }
        covMatrix[i][j] = len > 0 ? (sum / len) * 252 : 0;
      }
    }

    // Calculate individual Kellys for this combo
    const comboKellys = symbols.map((s) => kellyMap.get(s)?.kelly ?? 0);
    const maxIndividualKelly = Math.max(...comboKellys);

    // Nekrasov Portfolio Kelly: K* = μ^T Σ^-1 μ
    // Using equal-weight portfolio expected return
    const annReturns = symbols.map((s) => {
      const k = kellyMap.get(s);
      return k ? k.annReturn / 100 : 0;
    });

    const invCov = invertMatrix(covMatrix);

    // Portfolio excess returns vector
    const excessReturns = annReturns.map((r) => r - riskFreeRate);

    // Nekrasov K* = excessReturns^T * invCov * excessReturns
    let nekrasovKelly = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        nekrasovKelly += excessReturns[i] * invCov[i][j] * excessReturns[j];
      }
    }

    // Portfolio stats (equal weight)
    let portfolioVar = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVar += equalWeight * equalWeight * covMatrix[i][j];
      }
    }
    const portfolioVol = Math.sqrt(Math.max(0, portfolioVar));
    const portfolioReturn = annReturns.reduce((sum, r) => sum + r, 0) / n;
    const portfolioSharpe = portfolioVol === 0 ? 0 : (portfolioReturn - riskFreeRate) / portfolioVol;

    // Correlation matrix
    const corrMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const denom = Math.sqrt(covMatrix[i][i] * covMatrix[j][j]);
        corrMatrix[i][j] = denom === 0 ? 0 : covMatrix[i][j] / denom;
      }
    }

    // Best and worst diversifiers
    // Asset whose removal reduces K* the most = best diversifier
    let bestDiv = symbols[0];
    let worstDiv = symbols[0];
    let bestDiff = -Infinity;
    let worstDiff = Infinity;

    for (let exclude = 0; exclude < n; exclude++) {
      const reduced = symbols.filter((_, i) => i !== exclude);
      const reducedN = reduced.length;
      if (reducedN === 0) continue;

      const reducedCov = covMatrix
        .filter((_, i) => i !== exclude)
        .map((row) => row.filter((_, j) => j !== exclude));
      const reducedReturns = excessReturns.filter((_, i) => i !== exclude);
      const reducedInv = invertMatrix(reducedCov);

      let reducedK = 0;
      for (let i = 0; i < reducedN; i++) {
        for (let j = 0; j < reducedN; j++) {
          reducedK += reducedReturns[i] * reducedInv[i][j] * reducedReturns[j];
        }
      }

      const diff = nekrasovKelly - reducedK;
      if (diff > bestDiff) {
        bestDiff = diff;
        bestDiv = symbols[exclude];
      }
      if (diff < worstDiff) {
        worstDiff = diff;
        worstDiv = symbols[exclude];
      }
    }

    results.push({
      symbols,
      weights: Array(n).fill(equalWeight),
      individualKellys: comboKellys,
      maxIndividualKelly,
      nekrasovKelly: Math.max(0, nekrasovKelly),
      diversificationBonus: Math.max(0, nekrasovKelly) - maxIndividualKelly,
      portfolioSharpe,
      portfolioAnnReturn: portfolioReturn * 100,
      portfolioAnnVol: portfolioVol * 100,
      bestDiversifier: bestDiv,
      worstDiversifier: worstDiv,
      correlationMatrix: corrMatrix,
    });
  }

  // Sort by Diversification Bonus descending
  results.sort((a, b) => b.diversificationBonus - a.diversificationBonus);

  return { combinations: results, totalChecked: processed, individualKellys };
}
