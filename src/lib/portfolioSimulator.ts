import {
  calculateReturns,
  calculateMean,
  calculateStdDev,
  calculateAnnualizedReturn,
  calculateAnnualizedVolatility,
  type PricePoint,
} from './statistics';

export interface AssetConfig {
  symbol: string;
  weight: number;
  prices: PricePoint[];
}

export interface PortfolioSimParams {
  assets: AssetConfig[];
  initialInvestment: number;
  timeHorizonYears: number;
  numSimulations: number;
  rebalancing?: 'none' | 'monthly' | 'quarterly' | 'annual';
  transactionCost?: number;
  dcaAmount?: number;
  dcaFrequency?: 'none' | 'monthly' | 'quarterly';
  riskFreeRate?: number;
}

export interface PortfolioPath {
  days: number[];
  totalValue: number[];
  assetValues: number[][]; // [assetIndex][day]
}

export interface PortfolioSimResult {
  initialInvestment: number;
  finalMedian: number;
  finalMean: number;
  ciLower: number;
  ciUpper: number;
  medianCagr: number;
  maxDrawdownMedian: number;
  sharpeRatio: number;
  var5: number;
  cvar5: number;
  paths: PortfolioPath[];
  finalValues: number[];
  buyHoldFinalValues: number[];
  totalContributions: number;
  rebalancingCosts: number;
  assetStats: {
    symbol: string;
    annReturn: number;
    annVol: number;
    weight: number;
  }[];
  correlationMatrix: number[][];
}

function generateNormalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function choleskyDecomposition(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = matrix[i][i] - sum;
        if (val <= 0) {
          // Matrix not positive definite, add small jitter
          L[i][j] = Math.sqrt(Math.max(val, 1e-10));
        } else {
          L[i][j] = Math.sqrt(val);
        }
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

export function runPortfolioSimulation(params: PortfolioSimParams): PortfolioSimResult {
  const nAssets = params.assets.length;
  const tradingDays = 252;
  const totalDays = Math.round(params.timeHorizonYears * tradingDays);
  const riskFree = params.riskFreeRate ?? 0.02;

  // Normalize weights
  const totalWeight = params.assets.reduce((sum, a) => sum + a.weight, 0);
  const weights = params.assets.map((a) => a.weight / totalWeight);

  // Calculate returns for each asset
  const allReturns: number[][] = params.assets.map((a) => calculateReturns(a.prices));

  // Calculate means, vols, covariances
  const means = allReturns.map((r) => calculateMean(r));
  const vols = allReturns.map((r) => calculateStdDev(r));
  const annReturns = allReturns.map((r) => calculateAnnualizedReturn(r));
  const annVols = allReturns.map((r) => calculateAnnualizedVolatility(r));

  // Covariance matrix (daily)
  const covMatrix: number[][] = Array.from({ length: nAssets }, () => Array(nAssets).fill(0));
  for (let i = 0; i < nAssets; i++) {
    for (let j = 0; j < nAssets; j++) {
      const ri = allReturns[i];
      const rj = allReturns[j];
      const mi = means[i];
      const mj = means[j];
      let sum = 0;
      const len = Math.min(ri.length, rj.length);
      for (let k = 0; k < len; k++) {
        sum += (ri[k] - mi) * (rj[k] - mj);
      }
      covMatrix[i][j] = len > 0 ? sum / len : 0;
    }
  }

  // Correlation matrix for display
  const corrMatrix: number[][] = Array.from({ length: nAssets }, () => Array(nAssets).fill(0));
  for (let i = 0; i < nAssets; i++) {
    for (let j = 0; j < nAssets; j++) {
      const denom = Math.sqrt(covMatrix[i][i] * covMatrix[j][j]);
      corrMatrix[i][j] = denom === 0 ? 0 : covMatrix[i][j] / denom;
    }
  }

  // Cholesky of covariance matrix
  const L = choleskyDecomposition(covMatrix);

  const paths: PortfolioPath[] = [];
  const finalValues: number[] = [];
  const buyHoldFinalValues: number[] = [];
  const rebalancingCosts: number[] = [];
  let totalContributionsAll = 0;

  for (let sim = 0; sim < params.numSimulations; sim++) {
    const pathDays: number[] = [];
    const totalValue: number[] = [];
    const assetValues: number[][] = Array.from({ length: nAssets }, () => []);

    let values = weights.map((w) => params.initialInvestment * w);
    let rebalanceCosts = 0;

    // Buy-and-hold initial
    const bhValues = weights.map((w) => params.initialInvestment * w);

    for (let day = 0; day <= totalDays; day++) {
      pathDays.push(day);
      totalValue.push(values.reduce((a, b) => a + b, 0));
      for (let a = 0; a < nAssets; a++) {
        assetValues[a].push(values[a]);
      }
      if (day === totalDays) break;

      // Generate correlated random returns
      const Z = Array.from({ length: nAssets }, () => generateNormalRandom());
      const correlatedReturns: number[] = new Array(nAssets).fill(0);
      for (let i = 0; i < nAssets; i++) {
        let sum = 0;
        for (let j = 0; j <= i; j++) {
          sum += L[i][j] * Z[j];
        }
        // Daily correlated return (daily params, no dt scaling)
        correlatedReturns[i] = (means[i] - 0.5 * vols[i] * vols[i]) + sum;
      }

      // Apply returns
      for (let a = 0; a < nAssets; a++) {
        values[a] *= 1 + correlatedReturns[a];
        bhValues[a] *= 1 + correlatedReturns[a];
      }

      // DCA
      if (params.dcaAmount && params.dcaAmount > 0 && params.dcaFrequency !== 'none') {
        const dcaPeriod = params.dcaFrequency === 'monthly' ? 21 : 63;
        if (day > 0 && day % dcaPeriod === 0) {
          totalContributionsAll += params.dcaAmount;
          for (let a = 0; a < nAssets; a++) {
            values[a] += params.dcaAmount * weights[a];
          }
        }
      }

      // Rebalancing
      if (params.rebalancing && params.rebalancing !== 'none') {
        const rebPeriod =
          params.rebalancing === 'monthly' ? 21 :
          params.rebalancing === 'quarterly' ? 63 : 252;
        if (day > 0 && day % rebPeriod === 0) {
          const total = values.reduce((a, b) => a + b, 0);
          const targetValues = weights.map((w) => total * w);
          for (let a = 0; a < nAssets; a++) {
            const diff = Math.abs(values[a] - targetValues[a]);
            const cost = diff * (params.transactionCost ?? 0);
            rebalanceCosts += cost;
            values[a] = targetValues[a] - cost;
          }
        }
      }
    }

    paths.push({ days: pathDays, totalValue, assetValues });
    finalValues.push(totalValue[totalValue.length - 1]);
    buyHoldFinalValues.push(bhValues.reduce((a, b) => a + b, 0));
    rebalancingCosts.push(rebalanceCosts);
  }

  const maxDDs = paths.map((p) => {
    let peak = p.totalValue[0];
    let maxDD = 0;
    for (const v of p.totalValue) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  });

  const totalContributions = totalContributionsAll / params.numSimulations;

  // Portfolio-level annualized stats
  const portfolioAnnReturn = weights.reduce((sum, w, i) => sum + w * annReturns[i], 0);
  let portfolioAnnVar = 0;
  for (let i = 0; i < nAssets; i++) {
    for (let j = 0; j < nAssets; j++) {
      portfolioAnnVar += weights[i] * weights[j] * covMatrix[i][j] * tradingDays;
    }
  }
  const portfolioAnnVol = Math.sqrt(Math.max(0, portfolioAnnVar));
  const sharpe = portfolioAnnVol === 0 ? 0 : ((portfolioAnnReturn - riskFree) / portfolioAnnVol);

  // Percentiles
  const sortedFinal = [...finalValues].sort((a, b) => a - b);
  const p5 = sortedFinal[Math.floor(sortedFinal.length * 0.05)];
  const p50 = sortedFinal[Math.floor(sortedFinal.length * 0.50)];
  const p95 = sortedFinal[Math.floor(sortedFinal.length * 0.95)];

  const cvar = sortedFinal.slice(0, Math.ceil(sortedFinal.length * 0.05)).reduce((a, b) => a + b, 0) /
    Math.max(1, Math.ceil(sortedFinal.length * 0.05));

  return {
    initialInvestment: params.initialInvestment,
    finalMedian: p50,
    finalMean: finalValues.reduce((a, b) => a + b, 0) / finalValues.length,
    ciLower: p5,
    ciUpper: p95,
    medianCagr: p50 > 0 ? (Math.pow(p50 / (params.initialInvestment + totalContributions), 1 / params.timeHorizonYears) - 1) * 100 : -100,
    maxDrawdownMedian: maxDDs.sort((a, b) => a - b)[Math.floor(maxDDs.length * 0.5)] * 100,
    sharpeRatio: sharpe,
    var5: p5,
    cvar5: cvar,
    paths: paths.slice(0, 50),
    finalValues,
    buyHoldFinalValues,
    totalContributions,
    rebalancingCosts: rebalancingCosts.reduce((a, b) => a + b, 0) / rebalancingCosts.length,
    assetStats: params.assets.map((a, i) => ({
      symbol: a.symbol,
      annReturn: annReturns[i] * 100,
      annVol: annVols[i] * 100,
      weight: weights[i] * 100,
    })),
    correlationMatrix: corrMatrix,
  };
}
