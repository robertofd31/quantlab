import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine
} from 'recharts';
import { RotateCcw, Zap, AlertTriangle, Info, Trophy } from 'lucide-react';
import { fetchHistoricalData } from '../../lib/data';
import { calculateReturns, calculateMean, calculateStdDev } from '../../lib/statistics';

interface GameRound {
  week: number;
  portfolioValue: number;
  benchmarkValue: number;
  weeklyReturn: number;
  date: string;
}

interface GameStats {
  currentValue: number;
  benchmarkValue: number;
  totalReturn: number;
  annualizedReturn: number;
  weeksElapsed: number;
  currentDrawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  optimalKelly: number;
  kellyRatio: number;
  riskOfRuin: number;
  gameOver: boolean;
}

function calculateKellyFraction(returns: number[]): number {
  const mean = calculateMean(returns);
  const vol = calculateStdDev(returns);
  const variance = vol * vol;
  return variance === 0 ? 0 : mean / variance;
}

function generateBootstrapReturn(returns: number[]): number {
  const clean = returns.filter((r) => !isNaN(r));
  if (clean.length === 0) return 0;
  return clean[Math.floor(Math.random() * clean.length)];
}

interface MarkovState {
  bounds: number[];
  transitionMatrix: number[][];
  stateReturns: number[];
  currentState: number;
}

function buildMarkovChain(returns: number[], numStates: number = 5): MarkovState {
  const clean = returns.filter((r) => !isNaN(r));
  const sorted = [...clean].sort((a, b) => a - b);
  const bounds: number[] = [];
  for (let i = 0; i <= numStates; i++) {
    const idx = Math.floor((i / numStates) * (sorted.length - 1));
    bounds.push(sorted[idx]);
  }

  const states = clean.map((r) => {
    for (let j = 0; j < numStates; j++) {
      if (r <= bounds[j + 1]) return j;
    }
    return numStates - 1;
  });

  const matrix = Array.from({ length: numStates }, () => Array(numStates).fill(0));
  for (let i = 0; i < states.length - 1; i++) {
    matrix[states[i]][states[i + 1]]++;
  }

  for (let i = 0; i < numStates; i++) {
    const sum = matrix[i].reduce((a, b) => a + b, 0);
    if (sum > 0) matrix[i] = matrix[i].map((v) => v / sum);
    else matrix[i] = matrix[i].map(() => 1 / numStates);
  }

  const stateReturns = Array(numStates).fill(0);
  const stateCounts = Array(numStates).fill(0);
  for (let i = 0; i < states.length; i++) {
    stateReturns[states[i]] += clean[i];
    stateCounts[states[i]]++;
  }
  for (let i = 0; i < numStates; i++) {
    stateReturns[i] = stateCounts[i] > 0 ? stateReturns[i] / stateCounts[i] : 0;
  }

  return { bounds, transitionMatrix: matrix, stateReturns, currentState: Math.floor(numStates / 2) };
}

function generateMarkovReturn(markov: MarkovState): { ret: number; state: number } {
  const probs = markov.transitionMatrix[markov.currentState];
  const r = Math.random();
  let cum = 0;
  let nextState = 0;
  for (let s = 0; s < probs.length; s++) {
    cum += probs[s];
    if (r <= cum) { nextState = s; break; }
  }
  markov.currentState = nextState;
  const baseReturn = markov.stateReturns[nextState];
  const noise = (Math.random() - 0.5) * 0.02;
  return { ret: baseReturn + noise, state: nextState };
}

function getStateDescription(state: number, numStates: number): string {
  if (state === 0) return 'Strong Bear Market';
  if (state === numStates - 1) return 'Strong Bull Market';
  if (state < numStates / 2) return 'Mild Bear Market';
  if (state > numStates / 2) return 'Mild Bull Market';
  return 'Sideways Market';
}

function calculateGameStats(
  rounds: GameRound[],
  initialInvestment: number,
  optimalKelly: number,
  currentValue: number,
  benchmarkValue: number,
  currentDrawdown: number,
  maxDrawdown: number
): GameStats {
  const weeks = rounds.length;
  const totalReturn = (currentValue / initialInvestment) - 1;
  const annualizedReturn = weeks > 0 ? Math.pow(1 + totalReturn, 52 / weeks) - 1 : 0;

  const returns = rounds.map((r) => r.weeklyReturn);
  const meanReturn = returns.length > 0 ? calculateMean(returns) : 0;
  const stdReturn = returns.length > 0 ? calculateStdDev(returns) : 0;
  const sharpe = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(52) : 0;

  const portfolioRatio = Math.max(0.01, currentValue / initialInvestment);
  const riskOfRuin = Math.min(0.99, (1 - Math.exp(-2 * currentDrawdown)) / Math.sqrt(portfolioRatio));

  return {
    currentValue,
    benchmarkValue,
    totalReturn,
    annualizedReturn,
    weeksElapsed: weeks,
    currentDrawdown,
    maxDrawdown,
    sharpeRatio: sharpe,
    optimalKelly,
    kellyRatio: 0,
    riskOfRuin,
    gameOver: currentValue < initialInvestment * 0.01,
  };
}

const ASSET_OPTIONS = {
  'Equity Index': [
    { value: 'SPY', label: 'S&P 500' },
    { value: 'QQQ', label: 'Nasdaq 100' },
  ],
  'Individual Stock': [
    { value: 'AAPL', label: 'Apple (AAPL)' },
    { value: 'PLTR', label: 'Palantir (PLTR)' },
    { value: 'BRK-B', label: 'Berkshire Hathaway (BRK-B)' },
  ],
  'Cryptocurrency': [
    { value: 'BTC-USD', label: 'Bitcoin (BTC)' },
    { value: 'ETH-USD', label: 'Ethereum (ETH)' },
  ],
  'Bond': [
    { value: 'TLT', label: 'iShares 20+ Year Treasury Bond ETF (TLT)' },
    { value: 'IEF', label: 'iShares 7-10 Year Treasury Bond ETF (IEF)' },
  ],
};

export default function KellyGame() {
  const [assetType, setAssetType] = useState<keyof typeof ASSET_OPTIONS>('Equity Index');
  const [asset, setAsset] = useState('SPY');
  const [simulatorType, setSimulatorType] = useState<'Bootstrap' | 'Markov Chain'>('Bootstrap');
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [leverage, setLeverage] = useState(1.0);

  const [prices, setPrices] = useState<{ date: string; close: number }[] | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [optimalKelly, setOptimalKelly] = useState(0);
  const [markovState, setMarkovState] = useState<MarkovState | null>(null);
  const [currentStateDesc, setCurrentStateDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);

  const currentValue = rounds.length > 0 ? rounds[rounds.length - 1].portfolioValue : initialInvestment;
  const benchmarkValue = rounds.length > 0 ? rounds[rounds.length - 1].benchmarkValue : initialInvestment;
  const maxPortfolioValue = useMemo(() => {
    if (rounds.length === 0) return initialInvestment;
    return Math.max(initialInvestment, ...rounds.map((r) => r.portfolioValue));
  }, [rounds, initialInvestment]);
  const currentDrawdown = maxPortfolioValue > 0 ? 1 - currentValue / maxPortfolioValue : 0;
  const maxDrawdown = useMemo(() => {
    if (rounds.length === 0) return 0;
    let peak = initialInvestment;
    let maxDD = 0;
    for (const r of rounds) {
      if (r.portfolioValue > peak) peak = r.portfolioValue;
      const dd = (peak - r.portfolioValue) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }, [rounds, initialInvestment]);

  const stats = useMemo(() => {
    return calculateGameStats(rounds, initialInvestment, optimalKelly, currentValue, benchmarkValue, currentDrawdown, maxDrawdown);
  }, [rounds, initialInvestment, optimalKelly, currentValue, benchmarkValue, maxPortfolioValue, currentDrawdown, maxDrawdown]);

  const kellyRatio = optimalKelly > 0 ? leverage / optimalKelly : 0;

  const chartData = useMemo(() => {
    const data = [{ week: 0, portfolio: initialInvestment, benchmark: initialInvestment }];
    for (const r of rounds) {
      data.push({
        week: r.week,
        portfolio: r.portfolioValue,
        benchmark: r.benchmarkValue,
      });
    }
    return data;
  }, [rounds, initialInvestment]);

  const initializeGame = useCallback(async () => {
    setLoading(true);
    const data = await fetchHistoricalData(asset, 10);
    setPrices(data);
    const returns = calculateReturns(data);
    const kelly = calculateKellyFraction(returns);
    setOptimalKelly(kelly);
    setRounds([]);
    setGameInitialized(true);

    if (simulatorType === 'Markov Chain') {
      const mk = buildMarkovChain(returns, 5);
      setMarkovState(mk);
      setCurrentStateDesc(getStateDescription(mk.currentState, 5));
    } else {
      setMarkovState(null);
      setCurrentStateDesc('');
    }
    setLoading(false);
  }, [asset, simulatorType]);

  const advanceWeek = useCallback(() => {
    if (!prices || prices.length === 0) return;
    const returns = calculateReturns(prices);
    const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const prevPortfolio = lastRound ? lastRound.portfolioValue : initialInvestment;
    const prevBenchmark = lastRound ? lastRound.benchmarkValue : initialInvestment;

    let weeklyReturn = 0;
    if (simulatorType === 'Bootstrap') {
      weeklyReturn = generateBootstrapReturn(returns);
    } else if (markovState) {
      const result = generateMarkovReturn(markovState);
      weeklyReturn = result.ret;
      setCurrentStateDesc(getStateDescription(result.state, 5));
    }

    const leveragedReturn = weeklyReturn * leverage;
    const newPortfolio = prevPortfolio * (1 + leveragedReturn);
    const newBenchmark = prevBenchmark * (1 + weeklyReturn);

    const week = rounds.length + 1;
    const date = new Date();
    date.setDate(date.getDate() + week * 7);

    setRounds((prev) => [
      ...prev,
      {
        week,
        portfolioValue: newPortfolio,
        benchmarkValue: newBenchmark,
        weeklyReturn,
        date: date.toISOString().split('T')[0],
      },
    ]);
  }, [prices, rounds, initialInvestment, leverage, simulatorType, markovState]);

  const resetGame = useCallback(() => {
    setRounds([]);
    if (markovState) {
      markovState.currentState = Math.floor(markovState.stateReturns.length / 2);
      setCurrentStateDesc(getStateDescription(markovState.currentState, 5));
    }
  }, [markovState]);

  const getKellyMessage = () => {
    if (kellyRatio < 0.25) return { text: `You're being too cautious! (${kellyRatio.toFixed(2)}x optimal Kelly) Even my grandma takes more risk than this.`, color: 'text-blue-400' };
    if (kellyRatio < 0.5) return { text: `Playing it safe, huh? (${kellyRatio.toFixed(2)}x optimal Kelly) At least your money's growing... very... slowly...`, color: 'text-blue-400' };
    if (kellyRatio < 0.75) return { text: `Respectable conservatism. (${kellyRatio.toFixed(2)}x optimal Kelly) Smart money territory.`, color: 'text-green' };
    if (kellyRatio < 0.9) return { text: `Almost perfect! (${kellyRatio.toFixed(2)}x optimal Kelly) You've got risk management skills.`, color: 'text-green' };
    if (kellyRatio < 1.1) return { text: `Perfect balance! (${kellyRatio.toFixed(2)}x optimal Kelly) You're a Kelly Criterion master!`, color: 'text-gold' };
    if (kellyRatio < 1.5) return { text: `Getting aggressive... (${kellyRatio.toFixed(2)}x optimal Kelly) Hope you can handle the volatility!`, color: 'text-yellow-400' };
    if (kellyRatio < 2.0) return { text: `Bold strategy, Cotton! (${kellyRatio.toFixed(2)}x optimal Kelly) Let's see if it pays off.`, color: 'text-orange-400' };
    if (kellyRatio < 3.0) return { text: `Living dangerously! (${kellyRatio.toFixed(2)}x optimal Kelly) Your risk of ruin is climbing fast.`, color: 'text-red' };
    return { text: `YOLO mode activated! (${kellyRatio.toFixed(2)}x optimal Kelly) Hope you enjoy rollercoasters and sleepless nights.`, color: 'text-red' };
  };

  const kellyMsg = getKellyMessage();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold" />
          Kelly Betting Game
        </h1>
        <p className="text-text-muted text-sm mt-2">
          This interactive game demonstrates the Kelly criterion in action. Select an asset,
          set your initial investment and leverage amount, then advance week-by-week to see how
          your portfolio performs.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel — Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-secondary border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Game Controls</h2>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Asset Type</label>
              <select
                value={assetType}
                onChange={(e) => {
                  const type = e.target.value as keyof typeof ASSET_OPTIONS;
                  setAssetType(type);
                  setAsset(ASSET_OPTIONS[type][0].value);
                }}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                {Object.keys(ASSET_OPTIONS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Select Asset</label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                {ASSET_OPTIONS[assetType].map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Simulation Method</label>
              <div className="flex bg-card p-1 border border-border rounded-xl">
                {(['Bootstrap', 'Markov Chain'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSimulatorType(m)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${simulatorType === m ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={initializeGame}
              disabled={loading}
              className="w-full px-4 py-3 bg-gold hover:bg-gold-dark text-black font-black rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Initialize Game'}
            </button>
          </div>

          {gameInitialized && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary border border-border rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-white">Game Parameters</h2>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Initial Investment ($)</label>
                <input
                  type="number"
                  min={1000}
                  max={1000000}
                  step={1000}
                  value={initialInvestment}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInitialInvestment(val);
                    setRounds([]);
                  }}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Leverage</label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full accent-gold"
                />
                <div className="text-center text-white font-black">{leverage.toFixed(1)}x</div>
              </div>

              <div className={`text-xs ${kellyMsg.color} font-medium`}>{kellyMsg.text}</div>

              <button
                onClick={resetGame}
                className="w-full px-4 py-2 bg-card border border-border hover:border-gold text-white font-bold rounded-xl transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                Reset Game
              </button>
            </motion.div>
          )}
        </div>

        {/* Right Panel — Game Display */}
        <div className="lg:col-span-3 space-y-6">
          {!gameInitialized && (
            <div className="bg-secondary border border-border rounded-2xl p-8 text-center">
              <Info className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">Select an asset and click &apos;Initialize Game&apos; to start playing!</p>
            </div>
          )}

          {gameInitialized && stats.gameOver && (
            <div className="bg-red/10 border border-red/30 rounded-2xl p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red mx-auto mb-2" />
              <div className="text-red font-black text-xl">GAME OVER!</div>
              <div className="text-text-muted text-sm">Your portfolio has lost 99% of its value.</div>
            </div>
          )}

          {gameInitialized && (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Portfolio Value</div>
                  <div className="text-xl font-black text-white">${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div className={`text-xs font-bold ${stats.totalReturn >= 0 ? 'text-green' : 'text-red'}`}>
                    {(stats.totalReturn * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Benchmark Value</div>
                  <div className="text-xl font-black text-white">${benchmarkValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div className={`text-xs font-bold ${(benchmarkValue / initialInvestment - 1) >= 0 ? 'text-green' : 'text-red'}`}>
                    {((benchmarkValue / initialInvestment - 1) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Weeks Elapsed</div>
                  <div className="text-xl font-black text-white">{stats.weeksElapsed}</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Optimal Kelly</div>
                  <div className="text-xl font-black text-gold">{optimalKelly.toFixed(2)}x</div>
                </div>
              </div>

              {/* Advance Button */}
              <div className="flex justify-center">
                <button
                  onClick={advanceWeek}
                  disabled={stats.gameOver}
                  className="px-8 py-4 bg-green hover:bg-green-light text-black font-black rounded-xl transition-all disabled:opacity-30 text-lg flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Advance Week
                </button>
              </div>

              {/* Markov State */}
              {simulatorType === 'Markov Chain' && currentStateDesc && (
                <div className="bg-blue-400/10 border border-blue-400/30 rounded-xl p-4 text-center">
                  <span className="text-blue-400 font-bold">Current Market State: {currentStateDesc}</span>
                </div>
              )}

              {/* Chart */}
              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Kelly Betting Game: {asset}</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }}
                        formatter={(value: any, name: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name === 'portfolio' ? 'Portfolio' : 'Benchmark']}
                      />
                      <ReferenceLine y={initialInvestment} stroke="#6b6b80" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="portfolio" stroke="#00d4aa" strokeWidth={2} dot={false} name="portfolio" />
                      <Line type="monotone" dataKey="benchmark" stroke="#f5a623" strokeWidth={2} strokeDasharray="5 5" dot={false} name="benchmark" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Total Return</div>
                  <div className={`text-lg font-black ${stats.totalReturn >= 0 ? 'text-green' : 'text-red'}`}>{(stats.totalReturn * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Benchmark Return</div>
                  <div className={`text-lg font-black ${(benchmarkValue / initialInvestment - 1) >= 0 ? 'text-green' : 'text-red'}`}>{((benchmarkValue / initialInvestment - 1) * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Current Drawdown</div>
                  <div className="text-lg font-black text-red">{(stats.currentDrawdown * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Max Drawdown</div>
                  <div className="text-lg font-black text-red">{(stats.maxDrawdown * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Annualized Return</div>
                  <div className="text-lg font-black text-white">{(stats.annualizedReturn * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Sharpe Ratio</div>
                  <div className="text-lg font-black text-blue-400">{stats.sharpeRatio.toFixed(2)}</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Optimal Kelly</div>
                  <div className="text-lg font-black text-gold">{optimalKelly.toFixed(2)}x</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Risk of Ruin</div>
                  <div className="text-lg font-black text-red">{(stats.riskOfRuin * 100).toFixed(2)}%</div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gold" />
                  Kelly Betting Tips
                </h3>
                <div className="text-sm text-text-muted space-y-2">
                  <p><strong className="text-white">Full Kelly (1.0x optimal)</strong> maximizes long-term growth but has high volatility</p>
                  <p><strong className="text-white">Half Kelly (0.5x optimal)</strong> gives ~75% of the optimal growth rate with much less volatility</p>
                  <p><strong className="text-white">Quarter Kelly (0.25x optimal)</strong> gives ~90% of Half Kelly's growth rate with even less risk</p>
                  <p>Most professional investors use Fractional Kelly (25-50% of full Kelly) due to uncertainty in parameter estimation and risk aversion.</p>
                  <p className="text-gold font-bold">Remember: Going over optimal Kelly is much more dangerous than going under!</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
