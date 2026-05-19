import type { PricePoint } from './statistics';
import { calculateMean, calculateStdDev } from './statistics';

// ═════════════════════════════════════════════════════════════════════════
// KPI INTERFACES
// ═════════════════════════════════════════════════════════════════════════

export interface KpiInput {
  prices: PricePoint[];
  riskFreeRate?: number; // annual, as decimal (e.g., 0.04)
  symbol: string;
}

export interface KpiResult {
  id: string;
  name: string;
  category: 'Leverage' | 'Risk' | 'Distribution' | 'Volatility';
  values: Record<string, number | string>;
  signal: 'bullish' | 'neutral' | 'caution' | 'bearish';
  chartData?: any[];
}

// ═════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

function logReturns(prices: PricePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i].close / prices[i - 1].close));
  }
  return returns;
}

function simpleReturns(prices: PricePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
  }
  return returns;
}

function annualizeReturn(meanDailyReturn: number): number {
  return meanDailyReturn * 252;
}

function annualizeVolatility(dailyStdDev: number): number {
  return dailyStdDev * Math.sqrt(252);
}

// Helper: EWMA variance (used in VMKL)
function ewmaVariance(returns: number[], lambda: number = 0.94): number {
  if (returns.length < 20) return calculateStdDev(returns) ** 2;
  let var_ = 0;
  for (let i = 0; i < 20; i++) {
    var_ += returns[returns.length - 1 - i] ** 2;
  }
  var_ /= 20;

  for (let i = returns.length - 21; i >= 0; i--) {
    var_ = lambda * var_ + (1 - lambda) * returns[i + 1] ** 2;
  }
  return var_;
}

// ═════════════════════════════════════════════════════════════════════════
// KPI 1: JENSEN'S INEQUALITY + KELLY LEVERAGE
// ═════════════════════════════════════════════════════════════════════════

export function calcJensenKelly(input: KpiInput): KpiResult {
  const { prices, riskFreeRate = 0.04 } = input;
  const lookback = Math.min(prices.length - 1, 756);
  const recentPrices = prices.slice(-lookback - 1);

  const returns = logReturns(recentPrices);
  const meanRet = calculateMean(returns);
  const vol = calculateStdDev(returns);

  const arithAnnual = annualizeReturn(meanRet);
  const volAnnual = annualizeVolatility(vol);

  // Kelly
  const kellyFull = volAnnual === 0 || arithAnnual <= riskFreeRate
    ? 0
    : Math.max(0, (arithAnnual - riskFreeRate) / (volAnnual ** 2));

  const kelly75 = kellyFull * 0.75;
  const kelly50 = kellyFull * 0.5;
  const kelly25 = kellyFull * 0.25;

  // Sharpe optimal
  const sharpeOptimal = volAnnual === 0 || volAnnual === 0
    ? 0
    : Math.max(0, Math.min((arithAnnual - riskFreeRate) / (volAnnual ** 2), 10));

  // Geometric returns at key levels
  const geo = (lev: number) => {
    if (volAnnual === 0) return 0;
    const drag = (lev ** 2) * (volAnnual ** 2) / 2;
    return lev * arithAnnual - drag;
  };

  const geo1x = geo(1.0);
  const geo2x = geo(2.0);
  const geo3x = geo(3.0);
  const geoKelly = geo(kellyFull);
  const geoKelly50 = geo(kelly50);
  const geoSharpe = geo(sharpeOptimal);

  // Drags
  const drag1x = (1.0 ** 2) * (volAnnual ** 2) / 2;
  const drag2x = (2.0 ** 2) * (volAnnual ** 2) / 2;
  const drag3x = (3.0 ** 2) * (volAnnual ** 2) / 2;
  const dragKelly = (kellyFull ** 2) * (volAnnual ** 2) / 2;

  // Max survivable leverage
  const maxLev = arithAnnual <= 0 || volAnnual === 0
    ? 0
    : 2 * arithAnnual / (volAnnual ** 2);

  // Sharpe ratios
  const sharpe = (lev: number) => {
    if (volAnnual === 0) return 0;
    const excess = lev * arithAnnual - riskFreeRate;
    return excess / (lev * volAnnual);
  };

  // Chart data: geometric returns at various leverage levels
  // Include zone classification for each leverage level
  const chartData: any[] = [];
  for (let l = 0; l <= 5; l += 0.05) {
    const growth = geo(l);
    let zone = 'Underinvesting';
    const k = kellyFull || 1;
    if (l > k * 0.9) zone = 'Never Logical';
    else if (l > k * 0.66) zone = 'High Risk';
    else if (l > k * 0.33) zone = 'Optimal';

    chartData.push({
      leverage: parseFloat(l.toFixed(2)),
      growth: growth * 100,
      zone,
      isKelly: Math.abs(l - kellyFull) < 0.025,
      isHalfKelly: Math.abs(l - kelly50) < 0.025,
    });
  }

  // Signal based on Kelly full
  let signal: 'bullish' | 'neutral' | 'caution' | 'bearish' = 'bearish';
  if (kellyFull > 3) signal = 'bullish';
  else if (kellyFull > 1.5) signal = 'neutral';
  else if (kellyFull > 0.5) signal = 'caution';

  return {
    id: 'jensen-kelly',
    name: "Jensen's Inequality + Kelly Leverage",
    category: 'Leverage',
    values: {
      arithmeticReturn: parseFloat((arithAnnual * 100).toFixed(2)),
      volatility: parseFloat((volAnnual * 100).toFixed(2)),
      kellyFull: parseFloat(kellyFull.toFixed(2)),
      kelly75: parseFloat(kelly75.toFixed(2)),
      kelly50: parseFloat(kelly50.toFixed(2)),
      kelly25: parseFloat(kelly25.toFixed(2)),
      sharpeOptimal: parseFloat(sharpeOptimal.toFixed(2)),
      geo1x: parseFloat((geo1x * 100).toFixed(2)),
      geo2x: parseFloat((geo2x * 100).toFixed(2)),
      geo3x: parseFloat((geo3x * 100).toFixed(2)),
      geoKelly: parseFloat((geoKelly * 100).toFixed(2)),
      geoKelly50: parseFloat((geoKelly50 * 100).toFixed(2)),
      geoSharpe: parseFloat((geoSharpe * 100).toFixed(2)),
      drag1x: parseFloat((drag1x * 100).toFixed(2)),
      drag2x: parseFloat((drag2x * 100).toFixed(2)),
      drag3x: parseFloat((drag3x * 100).toFixed(2)),
      dragKelly: parseFloat((dragKelly * 100).toFixed(2)),
      maxLeverage: parseFloat(maxLev.toFixed(2)),
      sharpe1x: parseFloat(sharpe(1.0).toFixed(2)),
      sharpe2x: parseFloat(sharpe(2.0).toFixed(2)),
      sharpe3x: parseFloat(sharpe(3.0).toFixed(2)),
      sharpeKelly: parseFloat(sharpe(kellyFull).toFixed(2)),
      sharpeOptimalSharpe: parseFloat(sharpe(sharpeOptimal).toFixed(2)),
    },
    signal,
    chartData,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// KPI 2: OMEGA RATIO ANALYSIS
// ═════════════════════════════════════════════════════════════════════════

export interface OmegaCurvePoint {
  mar: number;
  omega: number;
}

export function calcOmegaRatio(input: KpiInput): KpiResult {
  const { prices } = input;
  const lookback = Math.min(prices.length - 1, 252);
  const returns = logReturns(prices).slice(-lookback);

  const annualThreshold = 0.10; // 10% annual target
  const dailyThreshold = Math.log(1 + annualThreshold) / 252;

  // Time series Omega
  const smoothing = 5;
  const rawOmegas: number[] = [];

  for (let i = lookback - 1; i >= smoothing - 1; i--) {
    let totalGains = 0;
    let totalLosses = 0;
    for (let j = 0; j < lookback && i - j >= 0; j++) {
      const ret = returns[i - j];
      if (ret > dailyThreshold) {
        totalGains += ret - dailyThreshold;
      } else {
        totalLosses += Math.abs(ret - dailyThreshold);
      }
    }
    const omega = totalLosses > 0 ? totalGains / totalLosses : 1;
    rawOmegas.push(omega);
  }

  // SMA smoothing
  const omegas: number[] = [];
  for (let i = smoothing - 1; i < rawOmegas.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothing; j++) {
      sum += rawOmegas[i - j];
    }
    omegas.push(sum / smoothing);
  }

  const currentOmega = omegas[omegas.length - 1] || 1;

  // Omega curve: calculate at multiple MAR levels
  const curveIncrements = 50;
  const maxMar = calculateStdDev(returns) * 2 * Math.sqrt(252 / (252 - 1));
  const curvePoints: OmegaCurvePoint[] = [];

  for (let i = 0; i <= curveIncrements; i++) {
    const mar = (maxMar * i / curveIncrements) * 100; // in percentage
    let posSum = 0;
    let negSum = 0;
    for (const ret of returns) {
      const excess = ret * 100 - mar;
      if (excess > 0) posSum += excess;
      else negSum += -excess;
    }
    const omega = negSum > 0 ? posSum / negSum : 1;
    curvePoints.push({ mar: parseFloat(mar.toFixed(1)), omega: parseFloat(omega.toFixed(2)) });
  }

  // Chart data for time series
  const chartData = omegas.map((o, i) => ({
    day: i,
    omega: parseFloat(o.toFixed(2)),
    excellent: o > 1.5,
    good: o > 1.0 && o <= 1.5,
    caution: o > 0.7 && o <= 1.0,
    poor: o <= 0.7,
  }));

  let signal: 'bullish' | 'neutral' | 'caution' | 'bearish' = 'bearish';
  if (currentOmega > 1.5) signal = 'bullish';
  else if (currentOmega > 1.0) signal = 'neutral';
  else if (currentOmega > 0.7) signal = 'caution';

  return {
    id: 'omega-ratio',
    name: 'Omega Ratio Analysis',
    category: 'Distribution',
    values: {
      currentOmega: parseFloat(currentOmega.toFixed(2)),
      annualTarget: 10,
      lookback,
      maxMar: parseFloat(maxMar.toFixed(2)),
      omegaCurve: JSON.stringify(curvePoints.slice(0, 25)), // first 25 points for display
    },
    signal,
    chartData,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// KPI 3: MULTI-LEVERAGE VAR/VaG
// ═════════════════════════════════════════════════════════════════════════

export interface VarVagResult {
  leverage: number;
  var: number;
  vag: number;
  ratio: number;
  varOn10k: number;
}

export function calcVarVag(input: KpiInput): KpiResult {
  const { prices } = input;
  const lookback = Math.min(prices.length - 1, 252);
  const holdingPeriod = 21;
  const confidence = 95;

  const returns = simpleReturns(prices);
  const leverages = [1.0, 2.0, 3.0];

  const results: VarVagResult[] = [];

  for (const leverage of leverages) {
    const returnArray: number[] = [];
    const numWindows = lookback - holdingPeriod + 1;

    for (let start = 1; start <= numWindows && start + holdingPeriod < returns.length; start++) {
      let compounded = 1.0;
      for (let day = 0; day < holdingPeriod; day++) {
        const idx = start + day;
        if (idx >= returns.length) break;
        const dailyReturn = returns[idx];
        const leveragedDaily = leverage * dailyReturn;
        const cappedReturn = Math.max(leveragedDaily, -1.0);
        compounded *= (1 + cappedReturn);
        if (compounded <= 0) {
          compounded = 0;
          break;
        }
      }
      const totalReturn = (compounded - 1) * 100;
      returnArray.push(totalReturn);
    }

    const sorted = [...returnArray].sort((a, b) => a - b);
    const varIndex = Math.max(0, Math.floor(sorted.length * (100 - confidence) / 100));
    const vagIndex = Math.max(0, Math.floor(sorted.length * confidence / 100));

    const varValue = sorted.length > 0 ? sorted[varIndex] : 0;
    const vagValue = sorted.length > 0 ? sorted[vagIndex] : 0;
    const ratio = varValue !== 0 ? vagValue / Math.abs(varValue) : 0;

    results.push({
      leverage,
      var: parseFloat(varValue.toFixed(2)),
      vag: parseFloat(vagValue.toFixed(2)),
      ratio: parseFloat(ratio.toFixed(2)),
      varOn10k: Math.round(Math.abs(varValue) * 100),
    });
  }

  const ratio3x = results[2]?.ratio ?? 0;
  let signal: 'bullish' | 'neutral' | 'caution' | 'bearish' = 'bearish';
  if (ratio3x > 6) signal = 'bullish';
  else if (ratio3x > 3) signal = 'neutral';
  else if (ratio3x > 1) signal = 'caution';

  return {
    id: 'var-vag',
    name: 'Multi-Leverage VAR/VaG',
    category: 'Risk',
    values: {
      var1x: results[0]?.var ?? 0,
      vag1x: results[0]?.vag ?? 0,
      ratio1x: results[0]?.ratio ?? 0,
      var2x: results[1]?.var ?? 0,
      vag2x: results[1]?.vag ?? 0,
      ratio2x: results[1]?.ratio ?? 0,
      var3x: results[2]?.var ?? 0,
      vag3x: results[2]?.vag ?? 0,
      ratio3x: results[2]?.ratio ?? 0,
      holdingPeriod,
      confidence,
      lookback,
    },
    signal,
    chartData: results,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// KPI 4: KELLY CRITERION CURVE
// ═════════════════════════════════════════════════════════════════════════

export interface KellyCurvePoint {
  leverage: number;
  growth: number;
  zone: string;
}

export function calcKellyCurve(input: KpiInput): KpiResult {
  const { prices } = input;
  const lookback = Math.min(prices.length - 1, 252);
  const returns = logReturns(prices).slice(-lookback);

  const meanReturn = calculateMean(returns);
  const vol = calculateStdDev(returns);

  const annualizedReturn = meanReturn * 252;
  const annualizedVol = vol * Math.sqrt(252);

  const optimalKelly = annualizedVol === 0 ? 0 : annualizedReturn / (annualizedVol ** 2);
  const halfKelly = optimalKelly * 0.5;

  // Find zero-crossing leverage (where growth = 0)
  const zeroGrowthLeverage = annualizedVol === 0 ? 0 : 2 * annualizedReturn / (annualizedVol ** 2);

  // Growth function
  const kellyGrowth = (leverage: number) => {
    return annualizedReturn * leverage - 0.5 * (annualizedVol ** 2) * (leverage ** 2);
  };

  // Calculate curve points
  const maxLeverageDisplay = 5;
  const increments = 100;
  const curve: KellyCurvePoint[] = [];

  for (let i = 0; i <= increments; i++) {
    const lev = (maxLeverageDisplay * i) / increments;
    const growth = kellyGrowth(lev);

    let zone = 'Underinvesting';
    if (lev > zeroGrowthLeverage) zone = 'Suicidal';
    else if (lev > optimalKelly) zone = 'Never Logical';
    else if (lev > optimalKelly * 0.66) zone = 'High Risk';
    else if (lev > optimalKelly * 0.33) zone = 'Optimal Sizing';

    curve.push({
      leverage: parseFloat(lev.toFixed(2)),
      growth: parseFloat((growth * 100).toFixed(2)),
      zone,
    });
  }

  // Find zero crossing
  const maxGrowth = kellyGrowth(optimalKelly);

  let signal: 'bullish' | 'neutral' | 'caution' | 'bearish' = 'bearish';
  if (optimalKelly > 3) signal = 'bullish';
  else if (optimalKelly > 1.5) signal = 'neutral';
  else if (optimalKelly > 0.5) signal = 'caution';

  return {
    id: 'kelly-curve',
    name: 'Kelly Criterion Curve',
    category: 'Leverage',
    values: {
      annualizedReturn: parseFloat((annualizedReturn * 100).toFixed(2)),
      annualizedVolatility: parseFloat((annualizedVol * 100).toFixed(2)),
      optimalKelly: parseFloat(optimalKelly.toFixed(2)),
      halfKelly: parseFloat(halfKelly.toFixed(2)),
      maxGrowth: parseFloat((maxGrowth * 100).toFixed(2)),
      zeroGrowthLeverage: parseFloat(zeroGrowthLeverage.toFixed(2)),
      regime: optimalKelly > 0 ? 'LONG' : optimalKelly < 0 ? 'SHORT' : 'NEUTRAL',
    },
    signal,
    chartData: curve,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// KPI 5: VOLATILITY MANAGED KELLY LEVERAGE (VMKL)
// ═════════════════════════════════════════════════════════════════════════

export function calcVMKL(input: KpiInput): KpiResult {
  const { prices } = input;
  const lookback = Math.min(prices.length - 1, 500);
  const returns = logReturns(prices).slice(-lookback);

  const lambda = 0.94;
  const volMultiplier = 1.0;
  const powerB = -1.76;
  const powerA = 0.10;
  const maxLeverage = 3.0;
  const minLeverage = 0.1;
  const kellyFraction = 0.75;
  const volFloor = 0.10;
  const leverageSmooth = 3;
  const sensitivityFactor = 1.25; // Enhanced mode

  // EWMA variance
  const ewmaVar = ewmaVariance(returns, lambda);
  const adjustedVar = ewmaVar * (volMultiplier ** 2);
  const rawForecastVol = Math.sqrt(adjustedVar * 252);
  const baseForecastVol = Math.max(rawForecastVol, volFloor);
  const forecastVol = baseForecastVol * sensitivityFactor;

  // Predicted mu
  const rawPredictedMu = powerA * Math.pow(forecastVol, powerB + 1);
  const muCap = 0.50;
  const predictedMu = Math.min(rawPredictedMu, muCap);
  const isMuCapped = rawPredictedMu > muCap;

  // Full Kelly
  const fullKelly = forecastVol === 0 ? 0 : predictedMu / (forecastVol ** 2);
  const kellyFractionLeverage = fullKelly * kellyFraction;
  const cappedLeverage = Math.max(minLeverage, Math.min(kellyFractionLeverage, maxLeverage));

  // SMA smoothing
  const rawLeverages: number[] = [];
  for (let i = 0; i < returns.length; i++) {
    const window = returns.slice(Math.max(0, i - leverageSmooth + 1), i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    const annAvg = avg * 252;
    const windowVol = Math.sqrt(ewmaVar * 252); // simplified
    const fk = windowVol === 0 ? 0 : annAvg / (windowVol ** 2);
    rawLeverages.push(Math.max(minLeverage, Math.min(fk * kellyFraction, maxLeverage)));
  }

  const optimalLeverage = rawLeverages[rawLeverages.length - 1] || cappedLeverage;

  // Regime classification
  const getRegime = (lev: number) => {
    if (lev >= 4.0) return 'VERY AGGRESSIVE';
    if (lev >= 2.5) return 'AGGRESSIVE';
    if (lev >= 1.5) return 'GROWTH';
    if (lev >= 0.75) return 'BALANCED';
    if (lev >= 0.25) return 'DEFENSIVE';
    return 'CASH';
  };

  const regime = getRegime(optimalLeverage);

  // Chart data with regime for each point
  const chartData = rawLeverages.map((lev, i) => ({
    day: i,
    leverage: parseFloat(lev.toFixed(2)),
    volatility: parseFloat((forecastVol * 100).toFixed(1)),
    regime: getRegime(lev),
  }));

  let signal: 'bullish' | 'neutral' | 'caution' | 'bearish' = 'bearish';
  if (optimalLeverage > 3) signal = 'bullish';
  else if (optimalLeverage > 2) signal = 'neutral';
  else if (optimalLeverage > 1) signal = 'caution';

  return {
    id: 'vmkl',
    name: 'Volatility Managed Kelly Leverage',
    category: 'Volatility',
    values: {
      forecastVol: parseFloat((forecastVol * 100).toFixed(1)),
      predictedMu: parseFloat((predictedMu * 100).toFixed(1)),
      fullKelly: parseFloat(fullKelly.toFixed(2)),
      kellyFraction: parseFloat((kellyFraction * 100).toFixed(0)),
      kellyFractionLeverage: parseFloat(kellyFractionLeverage.toFixed(2)),
      optimalLeverage: parseFloat(optimalLeverage.toFixed(2)),
      regime,
      isMuCapped: isMuCapped ? 'Yes' : 'No',
      exponentB: powerB,
      coefficientA: powerA,
    },
    signal,
    chartData,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// MASTER FUNCTION: Calculate all KPIs
// ═════════════════════════════════════════════════════════════════════════

export function calculateAllKpis(input: KpiInput): KpiResult[] {
  return [
    calcJensenKelly(input),
    calcOmegaRatio(input),
    calcVarVag(input),
    calcKellyCurve(input),
    calcVMKL(input),
  ];
}
