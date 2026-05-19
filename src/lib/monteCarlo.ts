import {
  calculateReturns,
  calculateMean,
  calculateStdDev,
  calculateAnnualizedReturn,
  calculateAnnualizedVolatility,
  percentile,
  type PricePoint,
} from './statistics';

export type SimulationModel = 'standard' | 'gbm' | 'garch' | 'markov' | 'feynman';

export interface SimulationParams {
  symbol: string;
  initialInvestment: number;
  timeHorizonYears: number;
  riskFreeRate: number;
  model: SimulationModel;
  numSimulations: number;
  leverage: number;
  leverageMethod: 'manual' | 'kelly' | 'fractional' | 'optimization';
  fraction?: number;
  historicalYears?: number;
}

export interface SimulationPath {
  days: number[];
  values: number[];
}

export interface PercentilePath {
  day: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
}

export interface SimulationResult {
  initialInvestment: number;
  finalMedian: number;
  finalMean: number;
  ciLower: number;
  ciUpper: number;
  medianCagr: number;
  leverage: number;
  maxDrawdownMedian: number;
  sharpeRatio: number;
  ruinProbability: number;
  var5: number;
  cvar5: number;
  paths: SimulationPath[];
  finalValues: number[];
  historicalPrices: PricePoint[];
  historicalReturn: number;
  historicalVolatility: number;
  modelParams?: Record<string, number | number[]>;
  percentilePaths: PercentilePath[];
}

function generateNormalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function fitGARCH(returns: number[]): { omega: number; alpha: number; beta: number; longRunVar: number } {
  const r2 = returns.map((r) => r * r);
  const n = returns.length;
  const longRunVar = calculateMean(r2);

  let bestLL = -Infinity;
  let best = { omega: 0.01, alpha: 0.1, beta: 0.85 };

  for (let a = 0.02; a <= 0.25; a += 0.03) {
    for (let b = 0.5; b <= 0.97; b += 0.05) {
      if (a + b >= 0.99) continue;
      const o = longRunVar * (1 - a - b);
      if (o <= 0) continue;
      let ll = 0;
      let sigma2 = longRunVar;
      for (let i = 0; i < n; i++) {
        sigma2 = o + a * (i > 0 ? returns[i - 1] * returns[i - 1] : longRunVar) + b * sigma2;
        ll += -0.5 * (Math.log(2 * Math.PI * sigma2) + (returns[i] * returns[i]) / sigma2);
      }
      if (ll > bestLL) {
        bestLL = ll;
        best = { omega: o, alpha: a, beta: b };
      }
    }
  }
  return { ...best, longRunVar };
}

function estimateMarkov(returns: number[]): { states: number[]; transitionMatrix: number[][]; stateReturns: number[][] } {
  const sorted = [...returns].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q2 = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const states = returns.map((r) => {
    if (r < q1) return 0;
    if (r < q2) return 1;
    if (r < q3) return 2;
    return 3;
  });

  const counts = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 1; i < states.length; i++) {
    counts[states[i - 1]][states[i]]++;
  }

  const transitionMatrix = counts.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum === 0 ? row.map(() => 0.25) : row.map((c) => c / sum);
  });

  const stateReturns: number[][] = [[], [], [], []];
  for (let i = 0; i < returns.length; i++) {
    stateReturns[states[i]].push(returns[i]);
  }

  return { states, transitionMatrix, stateReturns };
}

export function runMonteCarlo(params: SimulationParams, historicalPrices: PricePoint[]): SimulationResult {
  const returns = calculateReturns(historicalPrices);
  const mu = calculateMean(returns);
  const sigma = calculateStdDev(returns);
  const annReturn = calculateAnnualizedReturn(returns);
  const annVol = calculateAnnualizedVolatility(returns);

  const tradingDays = 252;
  const totalDays = Math.round(params.timeHorizonYears * tradingDays);
  const dt = 1 / tradingDays;

  const excessReturn = annReturn - params.riskFreeRate;
  let leverage = params.leverage;
  if (params.leverageMethod === 'kelly') {
    const kelly = excessReturn / (annVol * annVol);
    leverage = Math.max(0, Math.min(kelly, 5));
  } else if (params.leverageMethod === 'fractional') {
    const kelly = excessReturn / (annVol * annVol);
    const fraction = params.fraction ?? 0.5;
    leverage = Math.max(0, Math.min(kelly * fraction, 5));
  } else if (params.leverageMethod === 'optimization') {
    const testLevs = Array.from({ length: 51 }, (_, i) => i * 0.1);
    let bestG = -Infinity;
    let bestL = 0;
    for (const l of testLevs) {
      const g = excessReturn * l - 0.5 * annVol * annVol * l * l;
      if (g > bestG) { bestG = g; bestL = l; }
    }
    leverage = Math.max(0, Math.min(bestL, 5));
  }

  const paths: SimulationPath[] = [];
  const finalValues: number[] = [];

  let modelParams: Record<string, number | number[]> | undefined;

  // Pre-compute model-specific data
  let garchState = { omega: 0.01, alpha: 0.1, beta: 0.85, lr: sigma * sigma };
  let markovData: ReturnType<typeof estimateMarkov> | null = null;

  if (params.model === 'garch') {
    const fitted = fitGARCH(returns);
    garchState = { omega: fitted.omega, alpha: fitted.alpha, beta: fitted.beta, lr: fitted.longRunVar };
    modelParams = { omega: fitted.omega, alpha: fitted.alpha, beta: fitted.beta, longRunVar: fitted.longRunVar };
  }
  if (params.model === 'markov') {
    markovData = estimateMarkov(returns);
    modelParams = { transitionMatrix: markovData.transitionMatrix.flat() };
  }

  for (let sim = 0; sim < params.numSimulations; sim++) {
    const pathDays: number[] = [];
    const pathValues: number[] = [];
    let value = params.initialInvestment;
    let sigma2 = params.model === 'garch' ? garchState.lr : sigma * sigma;
    let markovState = markovData ? markovData.states[markovData.states.length - 1] : 0;

    for (let day = 0; day <= totalDays; day++) {
      pathDays.push(day);
      pathValues.push(value);
      if (day === totalDays) break;

      let dailyReturn = 0;
      const z = generateNormalRandom();

      if (params.model === 'standard') {
        dailyReturn = mu + sigma * z;
      } else if (params.model === 'gbm') {
        // Annualized params with dt scaling for continuous-time GBM
        dailyReturn = (annReturn - 0.5 * annVol * annVol) * dt + annVol * Math.sqrt(dt) * z;
      } else if (params.model === 'garch') {
        const vol = Math.sqrt(Math.max(sigma2, 1e-8));
        dailyReturn = mu + vol * z;
        sigma2 = garchState.omega + garchState.alpha * (dailyReturn * dailyReturn) + garchState.beta * sigma2;
      } else if (params.model === 'markov') {
        if (markovData) {
          const probs = markovData.transitionMatrix[markovState];
          let cum = 0;
          const r = Math.random();
          for (let s = 0; s < 4; s++) {
            cum += probs[s];
            if (r <= cum) { markovState = s; break; }
          }
          const stateRet = markovData.stateReturns[markovState];
          if (stateRet.length > 0) {
            const idx = Math.floor(Math.random() * stateRet.length);
            dailyReturn = stateRet[idx];
          } else {
            dailyReturn = mu + sigma * z;
          }
        }
      } else if (params.model === 'feynman') {
        const action = 0.5 * ((z * z)) + 0.1 * Math.abs(z);
        const weight = Math.exp(-action);
        dailyReturn = (annReturn - 0.5 * annVol * annVol) * dt + annVol * Math.sqrt(dt) * z * weight;
      }

      value *= 1 + dailyReturn * leverage;
      if (value < 0) value = 0;
    }

    paths.push({ days: pathDays, values: pathValues });
    finalValues.push(pathValues[pathValues.length - 1]);
  }

  const cagrValues = finalValues.map((fv) =>
    Math.pow(fv / params.initialInvestment, 1 / params.timeHorizonYears) - 1
  );

  const maxDDs = paths.map((p) => {
    let peak = p.values[0];
    let maxDD = 0;
    for (const v of p.values) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  });

  const ruinCount = finalValues.filter((v) => v < params.initialInvestment * 0.01).length;

  // Correct Sharpe: use volatility of simulated CAGRs
  const cagrVol = calculateStdDev(cagrValues);
  const sharpe = cagrVol === 0 ? 0 : (percentile(cagrValues, 0.5) * 100 - params.riskFreeRate * 100) / (cagrVol * 100);

  // Calculate daily percentiles and mean across all paths for the probability cone
  const percentilePaths: PercentilePath[] = [];
  const totalDaysInt = Math.round(totalDays);
  for (let day = 0; day <= totalDaysInt; day++) {
    const dayValues = paths.map((p) => p.values[day]);
    percentilePaths.push({
      day,
      p10: percentile(dayValues, 0.1),
      p25: percentile(dayValues, 0.25),
      p50: percentile(dayValues, 0.5),
      p75: percentile(dayValues, 0.75),
      p90: percentile(dayValues, 0.9),
      mean: calculateMean(dayValues),
    });
  }

  return {
    initialInvestment: params.initialInvestment,
    finalMedian: percentile(finalValues, 0.5),
    finalMean: calculateMean(finalValues),
    ciLower: percentile(finalValues, 0.025),
    ciUpper: percentile(finalValues, 0.975),
    medianCagr: percentile(cagrValues, 0.5) * 100,
    leverage,
    maxDrawdownMedian: percentile(maxDDs, 0.5) * 100,
    sharpeRatio: sharpe,
    ruinProbability: (ruinCount / finalValues.length) * 100,
    var5: percentile(finalValues, 0.05),
    cvar5: finalValues.filter((v) => v <= percentile(finalValues, 0.05)).reduce((a, b) => a + b, 0) /
      Math.max(1, finalValues.filter((v) => v <= percentile(finalValues, 0.05)).length),
    paths: paths.slice(0, 50),
    finalValues,
    historicalPrices,
    historicalReturn: annReturn * 100,
    historicalVolatility: annVol * 100,
    modelParams,
    percentilePaths,
  };
}

export function generateMockPrices(symbol: string, days: number = 252 * 5): PricePoint[] {
  const prices: PricePoint[] = [];
  let price = symbol === 'BTC' ? 65000 : symbol === 'QQQ' ? 450 : 520;
  const volatility = symbol === 'BTC' ? 0.03 : symbol === 'QQQ' ? 0.015 : 0.012;
  const drift = 0.0004;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = drift + volatility * (Math.random() - 0.5) * 2;
    price *= 1 + change;

    prices.push({
      date: date.toISOString().split('T')[0],
      close: parseFloat(price.toFixed(2)),
    });
  }

  return prices;
}
