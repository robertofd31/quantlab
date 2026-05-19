import { calculateReturns, calculateMean, calculateStdDev, type PricePoint } from './statistics';

export interface KellyGameRound {
  week: number;
  actualReturn: number;
  userPortfolio: number;
  kellyPortfolio: number;
  userBetFraction: number;
  kellyBetFraction: number;
}

export interface KellyGameResult {
  symbol: string;
  kellyFraction: number;
  annReturn: number;
  annVol: number;
  totalWeeks: number;
  userFinalValue: number;
  kellyFinalValue: number;
  userMaxDrawdown: number;
  kellyMaxDrawdown: number;
  rounds: KellyGameRound[];
  userScore: number;
  verdict: string;
}

export function calculateWeeklyKelly(prices: PricePoint[], riskFreeRate: number = 0.02): { kelly: number; annReturn: number; annVol: number } {
  // Convert daily prices to weekly returns
  const weeklyReturns: number[] = [];
  let weekPrices: number[] = [];
  
  for (const p of prices) {
    weekPrices.push(p.close);
    // Assume 5 trading days per week
    if (weekPrices.length >= 5) {
      const weeklyReturn = (weekPrices[weekPrices.length - 1] - weekPrices[0]) / weekPrices[0];
      weeklyReturns.push(weeklyReturn);
      weekPrices = [];
    }
  }

  if (weeklyReturns.length < 10) {
    // Fallback: use daily returns * sqrt(5) as weekly proxy
    const dailyReturns = calculateReturns(prices);
    const mean = calculateMean(dailyReturns);
    const vol = calculateStdDev(dailyReturns);
    const annReturn = mean * 252;
    const annVol = vol * Math.sqrt(252);
    const variance = annVol * annVol;
    const excessReturn = annReturn - riskFreeRate;
    const kelly = variance === 0 ? 0 : excessReturn / variance;
    return { kelly: Math.max(0, Math.min(kelly, 3)), annReturn: annReturn * 100, annVol: annVol * 100 };
  }

  const meanReturn = calculateMean(weeklyReturns);
  const vol = calculateStdDev(weeklyReturns);
  const annReturn = meanReturn * 52;
  const annVol = vol * Math.sqrt(52);
  const variance = annVol * annVol;
  const excessReturn = annReturn - riskFreeRate;
  const kelly = variance === 0 ? 0 : excessReturn / variance;

  return { kelly: Math.max(0, Math.min(kelly, 3)), annReturn: annReturn * 100, annVol: annVol * 100 };
}

export function runKellyGame(
  symbol: string,
  prices: PricePoint[],
  userBetFractions: number[],
  initialValue: number = 10000,
  riskFreeRate: number = 0.02
): KellyGameResult {
  const { kelly: kellyFraction, annReturn, annVol } = calculateWeeklyKelly(prices, riskFreeRate);

  // Generate weekly returns from historical data (shuffled)
  const weeklyReturns: number[] = [];
  let weekPrices: number[] = [];
  
  for (const p of prices) {
    weekPrices.push(p.close);
    if (weekPrices.length >= 5) {
      const weeklyReturn = (weekPrices[weekPrices.length - 1] - weekPrices[0]) / weekPrices[0];
      weeklyReturns.push(weeklyReturn);
      weekPrices = [];
    }
  }

  // If not enough weekly data, generate synthetic from daily
  if (weeklyReturns.length < userBetFractions.length) {
    const dailyReturns = calculateReturns(prices);
    for (let i = 0; i < userBetFractions.length; i++) {
      const weekRet = dailyReturns.slice(i * 5, (i + 1) * 5);
      const mean = weekRet.length > 0 ? weekRet.reduce((a, b) => a + b, 0) / weekRet.length : 0;
      weeklyReturns.push(mean);
    }
  }

  // Shuffle returns for the game (so it's not predictable)
  const shuffledReturns = [...weeklyReturns];
  for (let i = shuffledReturns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledReturns[i], shuffledReturns[j]] = [shuffledReturns[j], shuffledReturns[i]];
  }

  const rounds: KellyGameRound[] = [];
  let userValue = initialValue;
  let kellyValue = initialValue;
  let userPeak = initialValue;
  let kellyPeak = initialValue;
  let userMaxDD = 0;
  let kellyMaxDD = 0;

  for (let week = 0; week < userBetFractions.length; week++) {
    const userBet = userBetFractions[week];
    const kellyBet = kellyFraction;
    const weeklyReturn = shuffledReturns[week % shuffledReturns.length] || 0;

    // Apply returns: portfolio grows by (1 + bet_fraction * weekly_return)
    const userMultiplier = 1 + userBet * weeklyReturn;
    const kellyMultiplier = 1 + kellyBet * weeklyReturn;

    userValue *= userMultiplier;
    kellyValue *= kellyMultiplier;

    // Track drawdowns
    if (userValue > userPeak) userPeak = userValue;
    const userDD = (userPeak - userValue) / userPeak;
    if (userDD > userMaxDD) userMaxDD = userDD;

    if (kellyValue > kellyPeak) kellyPeak = kellyValue;
    const kellyDD = (kellyPeak - kellyValue) / kellyPeak;
    if (kellyDD > kellyMaxDD) kellyMaxDD = kellyDD;

    rounds.push({
      week: week + 1,
      actualReturn: weeklyReturn,
      userPortfolio: userValue,
      kellyPortfolio: kellyValue,
      userBetFraction: userBet,
      kellyBetFraction: kellyBet,
    });
  }

  // Score: how close to Kelly performance (capped at 100)
  const performanceRatio = kellyValue > 0 ? userValue / kellyValue : 0;
  const drawdownPenalty = userMaxDD * 0.5;
  const userScore = Math.min(100, Math.max(0, performanceRatio * 70 - drawdownPenalty * 30 + 30));

  let verdict = '';
  if (userScore >= 90) verdict = 'Master of Kelly! You matched or exceeded the optimal strategy.';
  else if (userScore >= 70) verdict = 'Great intuition! You were close to optimal Kelly betting.';
  else if (userScore >= 50) verdict = 'Not bad. You were conservative or aggressive at times.';
  else if (userValue < initialValue * 0.5) verdict = 'Ruin! You bet too much and destroyed capital.';
  else verdict = 'You underperformed Kelly significantly. Try betting closer to the optimal fraction.';

  return {
    symbol,
    kellyFraction,
    annReturn,
    annVol,
    totalWeeks: userBetFractions.length,
    userFinalValue: userValue,
    kellyFinalValue: kellyValue,
    userMaxDrawdown: userMaxDD * 100,
    kellyMaxDrawdown: kellyMaxDD * 100,
    rounds,
    userScore,
    verdict,
  };
}
